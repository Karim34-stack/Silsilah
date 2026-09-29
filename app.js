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
    renderTree();
    updateMemberDropdowns();
  } catch (err) {
    console.error("Gagal mengambil data:", err);
    alert("Gagal memuat data!");
  } finally {
    document.getElementById('loading').style.display = 'none';
  }
}

// Function Pembantu Membuat HTML Kartu Anggota Ringkas
function createCardHTML(member, isSpouse = false) {
  const isFemale = member.gender === 'Perempuan';
  const defaultAvatar = isFemale 
    ? 'https://cdn-icons-png.flaticon.com/512/4140/4140047.png' 
    : 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png';

  const photoSrc = member.photo_url || defaultAvatar;

  return `
    <div class="member-card ${isFemale ? 'female' : ''} ${isSpouse ? 'spouse-card' : ''}">
      <div class="action-btns">
        <button class="btn-action btn-edit" onclick="openEditModal('${member.id}')">Edit</button>
        <button class="btn-action btn-delete" onclick="deleteMember('${member.id}')">Hapus</button>
      </div>
      <img src="${photoSrc}" class="profile-img" alt="${member.full_name}" onerror="this.src='${defaultAvatar}'">
      <h3>${member.full_name}</h3>
      <p><strong>Kelamin:</strong> ${member.gender}</p>
      <p><strong>Orang Tua:</strong> ${member.parent_name && member.parent_name !== '-' ? member.parent_name : '-'}</p>
      <button class="btn-add-relative" onclick="quickAddRelative('${member.full_name}')">+ Tambah Kerabat</button>
    </div>
  `;
}

// Render Silsilah Pohon Bergaris secara Rekursif
function renderTree() {
  const container = document.getElementById('treeContainer');
  container.innerHTML = '';

  if (membersData.length === 0) {
    container.innerHTML = '<p style="color:#777;">Belum ada data anggota keluarga.</p>';
    return;
  }

  // Cari anggota leluhur/paling atas (orang tua yang tidak punya orang tua terdaftar)
  const roots = membersData.filter(m => {
    return !m.parent_name || m.parent_name === '-' || !membersData.some(p => p.full_name === m.parent_name);
  });

  // Urutkan leluhur: Anak/generasi paling tua di KANAN, muda di KIRI
  roots.sort((a, b) => (parseInt(b.child_order) || 0) - (parseInt(a.child_order) || 0));

  const ul = document.createElement('ul');

  roots.forEach(root => {
    ul.appendChild(buildTreeNode(root));
  });

  container.appendChild(ul);
}

// Fungsi Rekursif Membuat Node Pohon
function buildTreeNode(member) {
  const li = document.createElement('li');
  const cardContainer = document.createElement('div');
  cardContainer.className = 'member-card-container';

  // Kartu Utama
  cardContainer.innerHTML = createCardHTML(member);

  // Jika punya pasangan yang terdaftar di database, tampilkan bersebelahan
  if (member.spouse_name && member.spouse_name !== '-') {
    const spouseObj = membersData.find(m => m.full_name === member.spouse_name);
    if (spouseObj) {
      cardContainer.innerHTML += createCardHTML(spouseObj, true);
    }
  }

  li.appendChild(cardContainer);

  // Cari anak-anak dari anggota ini (atau dari pasangannya)
  const children = membersData.filter(m => {
    return m.parent_name === member.full_name || (member.spouse_name && m.parent_name === member.spouse_name);
  });

  // ATURAN URUTAN: Anak Paling Tua (Anak ke-1) di KANAN, Muda di KIRI (Descending Order)
  children.sort((a, b) => (parseInt(b.child_order) || 0) - (parseInt(a.child_order) || 0));

  if (children.length > 0) {
    const childrenUl = document.createElement('ul');
    children.forEach(child => {
      childrenUl.appendChild(buildTreeNode(child));
    });
    li.appendChild(childrenUl);
  }

  return li;
}

// Dropdown Pilihan Anggota
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

// Tambah Kerabat Otomatis
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

// Submit Form Tambah
document.getElementById('addMemberForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btnSubmit');
  
  const photoFileInput = document.getElementById('photo_file');
  let photoBase64 = "";

  if (photoFileInput.files.length > 0) {
    btn.innerText = "Mengunggah Foto...";
    btn.disabled = true;
    
    const file = photoFileInput.files[0];
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
      alert("Terjadi kesalahan dari server.");
    }
  } catch (err) {
    console.error("Error submit:", err);
    alert("Gagal menyimpan data.");
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

// Submit Edit
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

// Load data awal
loadMembers();
