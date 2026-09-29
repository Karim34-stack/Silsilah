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
    updateGenerationSearchOptions();
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

// =========================================================
// PENCARIAN SILSILAH - GENERASI & ANAK/CUCU
// =========================================================
function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

function getMemberByName(name) {
  const target = normalizeName(name);
  return membersData.find(m => normalizeName(m.full_name) === target) || null;
}

function buildGenerationMap() {
  const map = new Map();
  const byName = new Map();
  membersData.forEach(m => byName.set(normalizeName(m.full_name), m));

  // Semua anggota yang tidak mempunyai orang tua dimulai dari Generasi 1.
  membersData.forEach(m => {
    const parent = byName.get(normalizeName(m.parent_name));
    if (!m.parent_name || m.parent_name === '-' || !parent) map.set(m.id, 1);
  });

  // Sebarkan generasi berdasarkan orang tua dan pasangan.
  for (let round = 0; round < membersData.length + 2; round++) {
    let changed = false;
    membersData.forEach(m => {
      const parent = byName.get(normalizeName(m.parent_name));
      const spouse = byName.get(normalizeName(m.spouse_name));

      if (parent && map.has(parent.id)) {
        const next = map.get(parent.id) + 1;
        if (!map.has(m.id) || map.get(m.id) !== next) {
          map.set(m.id, next);
          changed = true;
        }
      } else if (spouse && map.has(spouse.id)) {
        const next = map.get(spouse.id);
        if (!map.has(m.id) || map.get(m.id) !== next) {
          map.set(m.id, next);
          changed = true;
        }
      }
    });
    if (!changed) break;
  }

  // Data yang benar-benar terpisah tetap ditampilkan sebagai Generasi 1.
  membersData.forEach(m => {
    if (!map.has(m.id)) map.set(m.id, 1);
  });

  return map;
}

function getGenerationMembers(generation) {
  const generationMap = buildGenerationMap();
  return membersData
    .filter(m => generationMap.get(m.id) === Number(generation))
    .sort((a, b) => {
      const ao = Number(a.child_order) || 999999;
      const bo = Number(b.child_order) || 999999;
      return ao - bo || normalizeName(a.full_name).localeCompare(normalizeName(b.full_name));
    });
}

function getDescendantsTwoLevels(person) {
  const personName = normalizeName(person.full_name);
  const children = membersData.filter(m => normalizeName(m.parent_name) === personName);
  const grandchildren = children.flatMap(child => {
    const childName = normalizeName(child.full_name);
    return membersData.filter(m => normalizeName(m.parent_name) === childName);
  });

  const unique = new Map();
  [...children, ...grandchildren].forEach(m => unique.set(String(m.id), m));
  return { children, grandchildren, all: [...unique.values()] };
}

function getPhotoForMember(member) {
  const female = normalizeName(member.gender) === 'perempuan';
  return member.photo_url || (female
    ? 'https://cdn-icons-png.flaticon.com/512/4140/4140047.png'
    : 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png');
}

function escapeSearchHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function createSearchResultCard(member, generation, relationText) {
  const female = normalizeName(member.gender) === 'perempuan';
  const photo = escapeSearchHtml(getPhotoForMember(member));
  const name = escapeSearchHtml(member.full_name || '-');
  const gender = escapeSearchHtml(member.gender || '-');
  const status = escapeSearchHtml(member.status || '-');
  const rel = escapeSearchHtml(relationText || `Generasi ${generation}`);
  const defaultAvatar = female
    ? 'https://cdn-icons-png.flaticon.com/512/4140/4140047.png'
    : 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png';

  return `
    <div class="search-result-card ${female ? 'female' : 'male'}">
      <img class="search-result-avatar" src="${photo}" alt="${name}"
        onerror="this.src='${defaultAvatar}'">
      <div class="search-result-info">
        <div class="search-result-name" title="${name}">${name}</div>
        <div class="search-result-meta">${gender} • ${status} • Generasi ${generation}</div>
        <span class="search-result-relation">${rel}</span>
      </div>
    </div>
  `;
}

function updateGenerationSearchOptions() {
  const select = document.getElementById('searchGeneration');
  if (!select) return;

  const oldValue = select.value;
  const generationMap = buildGenerationMap();
  const generations = [...new Set(membersData.map(m => generationMap.get(m.id)))]
    .filter(Boolean)
    .sort((a, b) => a - b);

  select.innerHTML = '<option value="">-- Semua Generasi --</option>';
  generations.forEach(g => {
    const option = document.createElement('option');
    option.value = String(g);
    option.textContent = `Generasi ${g}`;
    select.appendChild(option);
  });

  if (generations.includes(Number(oldValue))) select.value = oldValue;
}

function showSearchPanel(title, members, generationMap, relationMap = new Map()) {
  const panel = document.getElementById('searchResultsPanel');
  const results = document.getElementById('searchResults');
  const titleEl = document.getElementById('searchResultsTitle');
  const countEl = document.getElementById('searchResultsCount');
  if (!panel || !results || !titleEl || !countEl) return;

  panel.hidden = false;
  titleEl.textContent = title;
  countEl.textContent = `${members.length} anggota`;

  if (!members.length) {
    results.innerHTML = '<div class="search-result-empty">Tidak ada anggota yang ditemukan.</div>';
    return;
  }

  const groups = new Map();
  members.forEach(member => {
    const g = generationMap.get(member.id) || 1;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(member);
  });

  results.innerHTML = '';
  [...groups.keys()].sort((a, b) => a - b).forEach(g => {
    const heading = document.createElement('div');
    heading.className = 'search-result-group';
    heading.textContent = `Generasi ${g}`;
    results.appendChild(heading);

    groups.get(g).forEach(member => {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = createSearchResultCard(
        member,
        g,
        relationMap.get(String(member.id)) || `Generasi ${g}`
      );
      results.appendChild(wrapper.firstElementChild);
    });
  });
}

function performFamilySearch() {
  const nameInput = document.getElementById('searchName');
  const generationSelect = document.getElementById('searchGeneration');
  const panel = document.getElementById('searchResultsPanel');
  if (!nameInput || !generationSelect) return;

  const query = normalizeName(nameInput.value);
  const generationValue = generationSelect.value;
  const generationMap = buildGenerationMap();

  // Pencarian nama: tampilkan anggota yang dipilih + anak + cucu.
  if (query) {
    const exact = getMemberByName(query);
    const found = exact || membersData.find(m => normalizeName(m.full_name).includes(query));

    if (!found) {
      showSearchPanel(`Hasil nama: ${nameInput.value.trim()}`, [], generationMap);
      return;
    }

    const { children, grandchildren, all } = getDescendantsTwoLevels(found);
    const relationMap = new Map();
    relationMap.set(String(found.id), 'Anggota yang dicari');
    children.forEach(m => relationMap.set(String(m.id), `Anak dari ${found.full_name}`));
    grandchildren.forEach(m => relationMap.set(String(m.id), `Cucu dari ${found.full_name}`));

    showSearchPanel(
      `Keturunan ${found.full_name}`,
      [found, ...all],
      generationMap,
      relationMap
    );
    return;
  }

  // Pencarian generasi: tampilkan seluruh anggota generasi tersebut.
  if (generationValue) {
    const generation = Number(generationValue);
    const members = getGenerationMembers(generation);
    showSearchPanel(`Anggota Generasi ${generation}`, members, generationMap);
    return;
  }

  if (panel) panel.hidden = true;
}

function clearFamilySearch() {
  const name = document.getElementById('searchName');
  const generation = document.getElementById('searchGeneration');
  const panel = document.getElementById('searchResultsPanel');
  if (name) name.value = '';
  if (generation) generation.value = '';
  if (panel) panel.hidden = true;
}

function initFamilySearch() {
  const name = document.getElementById('searchName');
  const generation = document.getElementById('searchGeneration');
  const btn = document.getElementById('btnSearch');
  const clear = document.getElementById('btnClearSearch');

  if (!name || !generation) return;

  btn?.addEventListener('click', performFamilySearch);
  clear?.addEventListener('click', clearFamilySearch);
  generation.addEventListener('change', () => {
    if (name.value.trim()) name.value = '';
    performFamilySearch();
  });
  name.addEventListener('input', () => {
    if (name.value.trim()) generation.value = '';
    if (name.value.trim().length >= 2) performFamilySearch();
    if (!name.value.trim()) {
      const panel = document.getElementById('searchResultsPanel');
      if (panel) panel.hidden = true;
    }
  });
  name.addEventListener('keydown', e => {
    if (e.key === 'Enter') performFamilySearch();
  });
}

// =========================================================
// 1. INISIALISASI DATA KELUARGA (GLOBAL SCOPE)
// =========================================================
// Mengambil data dari LocalStorage, jika belum ada gunakan data awal/default
const defaultFamilyData = [
  { id: '1', nama: 'KYAI TOTARUNO', jenisKelamin: 'Laki-laki', orangTuaId: null, pasanganId: null, status: 'Wafat' },
  { id: '2', nama: 'KARSODIKRO', jenisKelamin: 'Laki-laki', orangTuaId: '1', pasanganId: '3', status: 'Wafat' },
  { id: '3', nama: 'SIAH', jenisKelamin: 'Perempuan', orangTuaId: null, pasanganId: '2', status: 'Wafat' },
  { id: '4', nama: 'HARTO REJO', jenisKelamin: 'Laki-laki', orangTuaId: '2', pasanganId: null, status: 'Wafat' },
  { id: '5', nama: 'MAR JI YEM', jenisKelamin: 'Laki-laki', orangTuaId: '2', pasanganId: null, status: 'Wafat' },
  { id: '6', nama: 'PRAMUDJO S...', jenisKelamin: 'Laki-laki', orangTuaId: '2', pasanganId: null, status: 'Hidup' },
  { id: '7', nama: 'DARMO SUKARTO', jenisKelamin: 'Laki-laki', orangTuaId: '2', pasanganId: null, status: 'Wafat' },
  { id: '8', nama: 'RUBIKEM', jenisKelamin: 'Perempuan', orangTuaId: '7', pasanganId: null, anakKe: 9, status: 'Hidup' },
  { id: '9', nama: 'SUNARDI', jenisKelamin: 'Laki-laki', orangTuaId: '7', pasanganId: null, status: 'Hidup' },
  { id: '10', nama: 'KAIDI', jenisKelamin: 'Laki-laki', orangTuaId: '7', pasanganId: null, status: 'Hidup' },
  { id: '11', nama: 'KEMIN', jenisKelamin: 'Laki-laki', orangTuaId: '7', pasanganId: null, status: 'Hidup' },
  { id: '12', nama: 'SAPTO', jenisKelamin: 'Laki-laki', orangTuaId: '7', pasanganId: null, status: 'Hidup' }
];

window.familyData = JSON.parse(localStorage.getItem('familyTreeData')) || defaultFamilyData;

// =========================================================
// 2. MEMUAT PILIHAN DROPDOWN (ORANG TUA & PASANGAN)
// =========================================================
function populateDropdowns() {
  const parentSelect = document.getElementById('parentSelect');
  const spouseSelect = document.getElementById('spouseSelect');

  if (!parentSelect || !spouseSelect) return;

  // Bersihkan dropdown
  parentSelect.innerHTML = '<option value="">-- Pilih Orang Tua (Jika ada) --</option>';
  spouseSelect.innerHTML = '<option value="">-- Pilih Pasangan (Jika ada) --</option>';

  window.familyData.forEach(person => {
    // Isi Dropdown Orang Tua
    const optParent = document.createElement('option');
    optParent.value = person.id;
    optParent.textContent = person.nama;
    parentSelect.appendChild(optParent);

    // Isi Dropdown Pasangan
    const optSpouse = document.createElement('option');
    optSpouse.value = person.id;
    optSpouse.textContent = person.nama;
    spouseSelect.appendChild(optSpouse);
  });
}

// =========================================================
// 3. FUNGSI MEMBUKA MODAL & OTOMATISASI FIELD
// =========================================================
function openAddRelativeModal(targetPersonId = null, relationType = null) {
  populateDropdowns(); // Update list pilihan di dropdown

  const modal = document.getElementById('addModal');
  const form = document.getElementById('relativeForm');
  const modalTitle = document.getElementById('modalTitle');

  if (form) form.reset();

  const nameInput = document.getElementById('namaInput');
  const genderSelect = document.getElementById('genderSelect');
  const parentSelect = document.getElementById('parentSelect');
  const spouseSelect = document.getElementById('spouseSelect');

  if (targetPersonId) {
    const targetPerson = window.familyData.find(p => p.id == targetPersonId);

    if (targetPerson) {
      if (relationType === 'spouse') {
        if (modalTitle) modalTitle.innerText = `+ Tambah Pasangan dari ${targetPerson.nama}`;
        // Otomatis set Jenis Kelamin berlawanan
        if (genderSelect) genderSelect.value = targetPerson.jenisKelamin === 'Laki-laki' ? 'Perempuan' : 'Laki-laki';
        // Otomatis pilih Pasangan
        if (spouseSelect) spouseSelect.value = targetPerson.id;
        if (parentSelect) parentSelect.value = '';

      } else if (relationType === 'child') {
        if (modalTitle) modalTitle.innerText = `+ Tambah Anak dari ${targetPerson.nama}`;
        // Otomatis pilih Orang Tua
        if (parentSelect) parentSelect.value = targetPerson.id;
        if (spouseSelect) spouseSelect.value = '';
        if (genderSelect) genderSelect.value = 'Laki-laki';
      }
    }
  } else {
    if (modalTitle) modalTitle.innerText = '+ Tambah Anggota Silsilah';
  }

  if (modal) {
    modal.style.display = 'block';
    modal.classList.add('show');
  }
}

// =========================================================
// 4. FUNGSI SIMPAN DATA & UPDATE RELASI 2 ARAH
// =========================================================
function saveRelativeData(event) {
  if (event) event.preventDefault();

  const nameInput = document.getElementById('namaInput');
  const genderSelect = document.getElementById('genderSelect');
  const parentSelect = document.getElementById('parentSelect');
  const spouseSelect = document.getElementById('spouseSelect');
  const childNoInput = document.getElementById('anakKeInput');
  const statusSelect = document.getElementById('statusSelect');

  if (!nameInput || !nameInput.value.trim()) {
    alert('Nama lengkap wajib diisi!');
    return;
  }

  const newId = 'person_' + Date.now();

  const newMember = {
    id: newId,
    nama: nameInput.value.trim().toUpperCase(),
    jenisKelamin: genderSelect ? genderSelect.value : 'Laki-laki',
    orangTuaId: parentSelect && parentSelect.value ? parentSelect.value : null,
    pasanganId: spouseSelect && spouseSelect.value ? spouseSelect.value : null,
    anakKe: childNoInput && childNoInput.value ? parseInt(childNoInput.value) : null,
    status: statusSelect ? statusSelect.value : 'Masih Hidup'
  };

  // 1. Tambah data baru ke variabel global
  window.familyData.push(newMember);

  // 2. ⚠️ RELASI DUA ARAH: Update data target pasangan (misal RUBIKEM)
  if (newMember.pasanganId) {
    const spouse = window.familyData.find(p => p.id == newMember.pasanganId);
    if (spouse) {
      spouse.pasanganId = newMember.id; // RUBIKEM otomatis menyimpan ID pasangan baru
    }
  }

  // 3. Simpan permanen ke LocalStorage
  localStorage.setItem('familyTreeData', JSON.stringify(window.familyData));

  // 4. Tutup Modal & Refresh Tampilan
  closeModal();

  if (typeof renderTree === 'function') {
    renderTree();
  } else {
    location.reload();
  }
}

// =========================================================
// 5. FUNGSI MENAMPILKAN DETAIL KERABAT (ALERT / MODAL)
// =========================================================
function showDetailKerabat(personId) {
  const person = window.familyData.find(p => p.id == personId);
  if (!person) return;

  const parent = window.familyData.find(p => p.id == person.orangTuaId);
  const spouse = window.familyData.find(p => p.id == person.pasanganId);

  const detailText = 
`📌 DETAIL KERABAT:

Nama Lengkap: ${person.nama}
Jenis Kelamin: ${person.jenisKelamin}
Orang Tua: ${parent ? parent.nama : '-'}
Pasangan: ${spouse ? spouse.nama : '-'}
Anak Ke-: ${person.anakKe || '-'}
Status: ${person.status}`;

  alert(detailText);
}

// =========================================================
// 6. FUNGSI PENUTUP MODAL & EVENT LISTENER
// =========================================================
function closeModal() {
  const modal = document.getElementById('addModal');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('show');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initFamilySearch();
  const form = document.getElementById('relativeForm');
  if (form) {
    form.addEventListener('submit', saveRelativeData);
  }
  
  // Event listener tombol close modal jika ada
  const closeBtns = document.querySelectorAll('.close-modal, .btn-close');
  closeBtns.forEach(btn => {
    btn.addEventListener('click', closeModal);
  });
});

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
