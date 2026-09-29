// ⚠️ MASUKKAN URL WEB APP GOOGLE APPS SCRIPT ANDA DI SINI
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxK_oVv7EJj3C1rY4IlO5TWxp-N7-NCiRD6CCc27jBbline6DAwjKh2Yc4I5DSnOFT7PQ/exec";


let isAdmin = false;
let membersData = [];
// Deklarasikan familyData di bagian paling atas app.js
let familyData = []; 

// Jika Anda menyimpan data di LocalStorage, muat saat pertama kali dibuka:
const savedData = localStorage.getItem('familyTreeData');
if (savedData) {
  try {
    familyData = JSON.parse(savedData);
  } catch (e) {
    console.error("Gagal membaca data dari LocalStorage", e);
  }
}

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

// Load Data dari Web App Apps Script
async function loadMembers() {
  const loadingEl = document.getElementById('loading');
  if (loadingEl) loadingEl.style.display = 'block';

  try {
    const res = await fetch(SCRIPT_URL, {
      method: 'GET',
      redirect: 'follow'
    });

    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

    const dataText = await res.text();
    membersData = JSON.parse(dataText);

    renderTree();
    updateMemberDropdowns();
  } catch (err) {
    console.error("Error Fetching Data:", err);
    alert("Gagal memuat data silsilah!");
  } finally {
    if (loadingEl) loadingEl.style.display = 'none';
  }
}

// Menutup dropdown jika diklik di luar area
window.addEventListener('click', function(e) {
  if (!e.target.matches('.add-btn')) {
    document.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.remove('show'));
  }
});

function toggleDropdown(id) {
  document.querySelectorAll('.dropdown-menu').forEach(menu => {
    if (menu.id !== `dropdown-${id}`) menu.classList.remove('show');
  });
  const currentMenu = document.getElementById(`dropdown-${id}`);
  if (currentMenu) currentMenu.classList.toggle('show');
}

// Fungsi Membuat HTML Kartu Individu
function createNodeHTML(member) {
  const isFemale = member.gender === 'Perempuan';
  const defaultAvatar = isFemale 
    ? 'https://cdn-icons-png.flaticon.com/512/4140/4140047.png' 
    : 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png';

  const photoSrc = member.photo_url || defaultAvatar;
  const isAlive = member.status === 'Masih Hidup';

  return `
    <div class="member-node ${isFemale ? 'female' : 'male'}">
      <div class="admin-action-btns">
        <button class="btn-admin edit" onclick="openMemberModal('edit', '${member.id}')">✏️</button>
        <button class="btn-admin del" onclick="deleteMember('${member.id}')">🗑️</button>
      </div>
      <div class="node-header">
        <img src="${photoSrc}" class="node-avatar" alt="${member.full_name}" onerror="this.src='${defaultAvatar}'">
        <div class="node-info">
          <div class="node-name" title="${member.full_name}">${member.full_name}</div>
          <div class="badges">
            <span class="badge-tag ${isFemale ? 'bg-female' : 'bg-male'}">${member.gender}</span>
            <span class="badge-tag ${isAlive ? 'bg-alive' : 'bg-dead'}">${isAlive ? 'Hidup' : 'Wafat'}</span>
          </div>
        </div>
      </div>
      <div class="node-actions">
        <button class="btn-link" onclick="showDetail('${member.id}')">Detail Kerabat</button>
        <div class="relative-dropdown">
          <button class="btn-link add-btn" onclick="toggleDropdown('${member.id}')">+ Kerabat</button>
          <div class="dropdown-menu" id="dropdown-${member.id}">
            <button class="dropdown-item" onclick="('${member.full_name}', 'child')">
              <span>🧍</span> Tambah Anak
            </button>
            <button class="dropdown-item" onclick="('${member.full_name}', 'spouse')">
              <span>🩷</span> Tambah Pasangan
            </button>
            <button class="dropdown-item" onclick="('${member.full_name}', 'parent')">
              <span>👨‍👩‍👦</span> Tambah Orang Tua
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Render Pohon Utama
function renderTree() {
  const container = document.getElementById('treeContainer');
  container.innerHTML = '';

  if (!membersData || membersData.length === 0) {
    container.innerHTML = '<p style="color:#94a3b8; padding: 20px;">Belum ada data anggota keluarga.</p>';
    return;
  }

  const processedSet = new Set();

  // Cari Leluhur
  const roots = membersData.filter(m => {
    return !m.parent_name || m.parent_name === '-' || !membersData.some(p => p.full_name === m.parent_name);
  });

  // Urutkan Leluhur: Tua di KANAN, Muda di KIRI
  roots.sort((a, b) => (parseInt(b.child_order) || 0) - (parseInt(a.child_order) || 0));

  const ul = document.createElement('ul');

  roots.forEach(root => {
    if (!processedSet.has(root.full_name)) {
      ul.appendChild(buildTreeNode(root, processedSet));
    }
  });

  membersData.forEach(m => {
    if (!processedSet.has(m.full_name)) {
      ul.appendChild(buildTreeNode(m, processedSet));
    }
  });

  container.appendChild(ul);
}

// Rekursif Membuat Node Pohon
function buildTreeNode(member, processedSet) {
  processedSet.add(member.full_name);

  const li = document.createElement('li');
  const coupleWrapper = document.createElement('div');
  coupleWrapper.className = 'couple-wrapper';

  coupleWrapper.innerHTML = createNodeHTML(member);

  let spouseMember = null;
  if (member.spouse_name && member.spouse_name !== '-') {
    spouseMember = membersData.find(m => m.full_name === member.spouse_name);
    if (spouseMember && !processedSet.has(spouseMember.full_name)) {
      processedSet.add(spouseMember.full_name);
      coupleWrapper.innerHTML += `<span class="heart-icon">🩷</span>` + createNodeHTML(spouseMember);
    }
  }

  li.appendChild(coupleWrapper);

  const children = membersData.filter(m => {
    const isChildOfMember = m.parent_name === member.full_name;
    const isChildOfSpouse = spouseMember && m.parent_name === spouseMember.full_name;
    return (isChildOfMember || isChildOfSpouse) && !processedSet.has(m.full_name);
  });

  children.sort((a, b) => (parseInt(b.child_order) || 0) - (parseInt(a.child_order) || 0));

  if (children.length > 0) {
    const childrenUl = document.createElement('ul');
    children.forEach(child => {
      childrenUl.appendChild(buildTreeNode(child, processedSet));
    });
    li.appendChild(childrenUl);
  }

  return li;
}

function openAddRelativeModal(targetPersonId, relationType) {
  // Pastikan familyData bernilai array
  if (!Array.isArray(familyData)) {
    familyData = [];
  }

  // Cari data orang yang diklik
  const targetPerson = familyData.find(person => person.id == targetPersonId);

  // Ambil elemen form
  const modalTitle = document.getElementById('modalTitle');
  const genderSelect = document.getElementById('genderSelect');
  const parentSelect = document.getElementById('parentSelect');
  const spouseSelect = document.getElementById('spouseSelect');

  // Jika modal/form dibuka dari tombol "+ Tambah Anggota" biasa (tanpa targetPerson)
  if (!targetPerson) {
    if (modalTitle) modalTitle.innerText = "+ Tambah Anggota Silsilah";
    // Reset isi pilihan
    if (genderSelect) genderSelect.value = "Laki-laki";
    if (parentSelect) parentSelect.value = "";
    if (spouseSelect) spouseSelect.value = "";
  } else {
    // Jika dibuka dari tombol relasi (+ Pasangan, + Anak, dst.)
    if (relationType === 'spouse') {
      if (modalTitle) modalTitle.innerText = `+ Tambah Pasangan dari ${targetPerson.nama}`;
      
      // Otomatis set jenis kelamin berlawanan
      if (genderSelect) {
        genderSelect.value = (targetPerson.jenisKelamin === 'Laki-laki') ? 'Perempuan' : 'Laki-laki';
      }
      
      // Otomatis set nama pasangan
      if (spouseSelect) spouseSelect.value = targetPerson.id;
      if (parentSelect) parentSelect.value = "";

    } else if (relationType === 'child') {
      if (modalTitle) modalTitle.innerText = `+ Tambah Anak dari ${targetPerson.nama}`;
      if (parentSelect) parentSelect.value = targetPerson.id;
      if (spouseSelect) spouseSelect.value = "";
    }
  }

  // Tampilkan Modal
  const modalElement = document.getElementById('addModal'); // Sesuaikan ID modal Anda
  if (modalElement) {
    modalElement.style.display = 'block'; // Atau .classList.add('show');
  }
}

// Buka Modal Form Utama
function openMemberModal(mode, id = null) {
  document.getElementById('memberForm').reset();
  document.getElementById('form_action').value = mode;

  if (mode === 'add') {
    document.getElementById('modalTitle').innerText = "+ Tambah Anggota Keluarga";
  } else if (mode === 'edit') {
    if (!isAdmin) return;
    const member = membersData.find(m => m.id === id);
    if (!member) return;

    document.getElementById('modalTitle').innerText = "Edit Data Anggota";
    document.getElementById('form_id').value = member.id;
    document.getElementById('full_name').value = member.full_name;
    document.getElementById('gender').value = member.gender;
    document.getElementById('parent_name').value = member.parent_name || '-';
    document.getElementById('spouse_name').value = member.spouse_name || '-';
    document.getElementById('child_order').value = member.child_order || '';
    document.getElementById('status').value = member.status;
  }

  document.getElementById('memberModal').style.display = 'flex';
}

function closeMemberModal() {
  document.getElementById('memberModal').style.display = 'none';
}

// Submit Form CRUD
document.getElementById('memberForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btnSubmit');
  const action = document.getElementById('form_action').value;
  
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
    action: action,
    id: document.getElementById('form_id').value,
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
      alert(action === 'add' ? "Data berhasil disimpan!" : "Data berhasil diperbarui!");
      closeMemberModal();
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

// Detail Kerabat
function showDetail(id) {
  const member = membersData.find(m => m.id === id);
  if (!member) return;

  alert(
    `📌 DETAIL KERABAT:\n\n` +
    `Nama Lengkap: ${member.full_name}\n` +
    `Jenis Kelamin: ${member.gender}\n` +
    `Orang Tua: ${member.parent_name || '-'}\n` +
    `Pasangan: ${member.spouse_name || '-'}\n` +
    `Anak Ke-: ${member.child_order || '-'}\n` +
    `Status: ${member.status}`
  );
}

// Dropdown Options
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

function handleFormSubmit(event) {
  event.preventDefault();

  // 1. Buat objek data anggota keluarga baru
  const newMember = {
    id: Date.now().toString(), // atau ID unik lainnya
    nama: document.getElementById('namaInput').value.trim(),
    jenisKelamin: document.getElementById('genderSelect').value,
    orangTuaId: document.getElementById('parentSelect').value || null,
    pasanganId: document.getElementById('spouseSelect').value || null,
    anakKe: document.getElementById('anakKeInput').value || null,
    status: document.getElementById('statusSelect').value
  };

  // 2. Simpan anggota baru ke dalam array/database
  familyData.push(newMember);

  // 3. ⚠️ KUNCI PERBAIKAN: Update data pasangan secara dua arah (Two-way update)
  if (newMember.pasanganId) {
    // Cari data target pasangan (misal: RUBIKEM) berdasarkan ID
    const spousePerson = familyData.find(person => person.id === newMember.pasanganId);
    
    if (spousePerson) {
      // Update field pasangan milik RUBIKEM secara otomatis dengan nama/ID anggota baru
      spousePerson.pasanganId = newMember.id;
      
      // Jika penyimpanan menggunakan field nama langsung:
      // spousePerson.pasangan = newMember.nama;
    }
  }

  // 4. Simpan ke LocalStorage / Database Backend (jika ada)
  saveFamilyDataToStorage();

  // 5. Render ulang pohon silsilah & tutup modal
  renderTree();
  closeModal();
}

// Inisialisasi
loadMembers();
