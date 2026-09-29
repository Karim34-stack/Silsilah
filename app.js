// ⚠️ MASUKKAN URL WEB APP GOOGLE APPS SCRIPT ANDA DI SINI
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxK_oVv7EJj3C1rY4IlO5TWxp-N7-NCiRD6CCc27jBbline6DAwjKh2Yc4I5DSnOFT7PQ/exec";

let isAdmin = false;
let membersData = [];

// Helper Convert File to Base64
const toBase64 = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result);
  reader.onerror = error => reject(error);
});

// Switch Mode Admin
function toggleAdmin() {
  if (!isAdmin) {
    const pass = prompt("Masukkan Password Admin (Default: 1234):");
    if (pass === "1234") {
      isAdmin = true;
      alert("Login Admin Berhasil!");
    } else {
      alert("Password salah!");
      return;
    }
  } else {
    isAdmin = false;
  }

  document.getElementById('role-status').innerText = isAdmin ? "Mode: ADMIN (Full Control)" : "Mode: Member (Tambah Saja)";
  document.body.classList.toggle('admin-mode', isAdmin);
}

// Load Data
async function loadMembers() {
  document.getElementById('loading').style.display = 'block';
  try {
    const res = await fetch(SCRIPT_URL);
    membersData = await res.json();
    renderMembers();
    updateMemberDropdowns();
  } catch (err) {
    console.error("Gagal mengambil data:", err);
    alert("Gagal memuat data!");
  } finally {
    document.getElementById('loading').style.display = 'none';
  }
}

// Render Kartu Anggota
function renderMembers() {
  const grid = document.getElementById('memberGrid');
  grid.innerHTML = '';

  if (membersData.length === 0) {
    grid.innerHTML = '<p style="color:#777;">Belum ada data anggota keluarga.</p>';
    return;
  }

  membersData.forEach(member => {
    const isFemale = member.gender === 'Perempuan';
    const card = document.createElement('div');
    card.className = `member-card ${isFemale ? 'female' : ''}`;
    
    const defaultAvatar = isFemale 
      ? 'https://cdn-icons-png.flaticon.com/512/4140/4140047.png' 
      : 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png';

    const photoSrc = member.photo_url || defaultAvatar;

    card.innerHTML = `
      <div class="action-btns">
        <button class="btn-action btn-edit" onclick="openEditModal('${member.id}')">Edit</button>
        <button class="btn-action btn-delete" onclick="deleteMember('${member.id}')">Hapus</button>
      </div>
      <img src="${photoSrc}" class="profile-img" alt="${member.full_name}" onerror="this.src='${defaultAvatar}'">
      <h3>${member.full_name}</h3>
      <p><strong>Kelamin:</strong> ${member.gender}</p>
      <p><strong>Orang Tua:</strong> ${member.parent_name || '-'}</p>
      <p><strong>Pasangan:</strong> ${member.spouse_name || '-'}</p>
      <p><strong>Anak Ke-:</strong> ${member.child_order || '-'}</p>
      <span class="badge">${member.status}</span>
      <button class="btn-add-relative" onclick="quickAddRelative('${member.full_name}')">+ Tambah Kerabat</button>
      <div class="timestamp">
        Dibuat: ${member.created_at || '-'}<br>
        Diperbarui: ${member.updated_at || '-'}
      </div>
    `;
    grid.appendChild(card);
  });
}

// Dropdown Pilihan Anggota untuk Orang Tua & Pasangan
function updateMemberDropdowns() {
  const dropdowns = document.querySelectorAll('.member-dropdown');
  dropdowns.forEach(select => {
    const currentValue = select.value;
    const isParentDropdown = select.id.includes('parent');
    
    select.innerHTML = isParentDropdown 
      ? '<option value="-">-- Pilih Orang Tua (Jika ada) --</option>' 
      : '<option value="-">-- Pilih Pasangan (Jika ada) --</option>';

    membersData.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.full_name;
      opt.innerText = m.full_name;
      select.appendChild(opt);
    });
    select.value = currentValue;
  });
}

// Tambah Kerabat Otomatis dari Kartu
function quickAddRelative(targetName) {
  const relType = prompt(
    `Tambahkan hubungan untuk ${targetName}:\n\n1 = Anak (Sebutkan ${targetName} sebagai Orang Tua)\n2 = Pasangan (Sebutkan ${targetName} sebagai Pasangan)\n\nMasukkan angka (1/2):`
  );

  if (relType === '1') {
    resetForm();
    document.getElementById('parent_name').value = targetName;
    document.getElementById('formTitle').innerText = `+ Tambah Anak dari ${targetName}`;
    document.getElementById('btnCancel').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (relType === '2') {
    resetForm();
    document.getElementById('spouse_name').value = targetName;
    document.getElementById('formTitle').innerText = `+ Tambah Pasangan dari ${targetName}`;
    document.getElementById('btnCancel').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// Reset Form Tambah Data
function resetForm() {
  document.getElementById('addMemberForm').reset();
  document.getElementById('formTitle').innerText = "+ Tambah Anggota Keluarga";
  document.getElementById('btnCancel').style.display = 'none';
}

// Submit Form Tambah Anggota (Optimized & Fast)
document.getElementById('addMemberForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btnSubmit');
  
  const photoFileInput = document.getElementById('photo_file');
  let photoBase64 = "";

  // Jika ada foto, cek ukuran dan konversi
  if (photoFileInput.files.length > 0) {
    btn.innerText = "Mengunggah Foto...";
    btn.disabled = true;
    
    const file = photoFileInput.files[0];
    // Batasi ukuran file maksimal 2MB agar proses tidak terlalu lama
    if (file.size > 2 * 1024 * 1024) {
      alert("Ukuran foto terlalu besar! Maksimal 2MB.");
      btn.innerText = "Simpan Data";
      btn.disabled = false;
      return;
    }
    photoBase64 = await toBase64(file);
  } else {
    btn.innerText = "Menyimpan Data...";
    btn.disabled = true;
  }

  const payload = {
    action: "add",
    full_name: document.getElementById('full_name').value,
    gender: document.getElementById('gender').value,
    parent_name: document.getElementById('parent_name').value,
    spouse_name: document.getElementById('spouse_name').value,
    child_order: document.getElementById('child_order').value,
    status: document.getElementById('status').value,
    photo_base64: photoBase64
  };

  try {
    const response = await fetch(SCRIPT_URL, { 
      method: 'POST', 
      body: JSON.stringify(payload) 
    });
    
    if (response.ok) {
      alert("Data berhasil disimpan!");
      resetForm();
      await loadMembers();
    } else {
      alert("Terjadi respons gagal dari server.");
    }
  } catch (err) {
    console.error("Error submit:", err);
    alert("Gagal menyimpan data. Pastikan koneksi internet stabil.");
  } finally {
    btn.innerText = "Simpan Data";
    btn.disabled = false;
  }
});

// Modal Edit (Admin)
function openEditModal(id) {
  if (!isAdmin) return;
  const member = membersData.find(m => m.id === id);
  if (!member) return;

  document.getElementById('edit_id').value = member.id;
  document.getElementById('edit_full_name').value = member.full_name;
  document.getElementById('edit_gender').value = member.gender;
  document.getElementById('edit_parent_name').value = member.parent_name || '-';
  document.getElementById('edit_spouse_name').value = member.spouse_name || '-';
  document.getElementById('edit_child_order').value = member.child_order || '';
  document.getElementById('edit_status').value = member.status;

  document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
  document.getElementById('editModal').style.display = 'none';
}

// Submit Edit Data
document.getElementById('editMemberForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btnEditSubmit');
  btn.innerText = "Memperbarui...";
  btn.disabled = true;

  const photoFileInput = document.getElementById('edit_photo_file');
  let photoBase64 = "";

  if (photoFileInput.files.length > 0) {
    photoBase64 = await toBase64(photoFileInput.files[0]);
  }

  const payload = {
    action: "edit",
    id: document.getElementById('edit_id').value,
    full_name: document.getElementById('edit_full_name').value,
    gender: document.getElementById('edit_gender').value,
    parent_name: document.getElementById('edit_parent_name').value,
    spouse_name: document.getElementById('edit_spouse_name').value,
    child_order: document.getElementById('edit_child_order').value,
    status: document.getElementById('edit_status').value,
    photo_base64: photoBase64
  };

  try {
    await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
    alert("Data berhasil diperbarui!");
    closeEditModal();
    await loadMembers();
  } catch (err) {
    alert("Gagal memperbarui data.");
  } finally {
    btn.innerText = "Update Data";
    btn.disabled = false;
  }
});

// Hapus Data
async function deleteMember(id) {
  if (!isAdmin) return;
  if (!confirm("Apakah Anda yakin ingin menghapus data anggota keluarga ini?")) return;

  try {
    await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({ action: "delete", id: id })
    });
    alert("Data berhasil dihapus!");
    await loadMembers();
  } catch (err) {
    alert("Gagal menghapus data.");
  }
}

// Inisialisasi
loadMembers();
