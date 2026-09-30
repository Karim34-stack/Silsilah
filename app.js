// ⚠️ MASUKKAN URL WEB APP GOOGLE APPS SCRIPT ANDA DI SINI
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxK_oVv7EJj3C1rY4IlO5TWxp-N7-NCiRD6CCc27jBbline6DAwjKh2Yc4I5DSnOFT7PQ/exec";

let isAdmin = false;
let membersData = [];

// Base Initial Data Fallback
const defaultFamilyData = [
  { id: '1', full_name: 'KYAI TOTARUNO', gender: 'Laki-laki', parent_name: '-', spouse_name: '-', child_order: 1, status: 'Almarhum / Almarhumah' },
  { id: '2', full_name: 'KARSODIKRO', gender: 'Laki-laki', parent_name: 'KYAI TOTARUNO', spouse_name: 'SIAH', child_order: 1, status: 'Almarhum / Almarhumah' },
  { id: '3', full_name: 'SIAH', gender: 'Perempuan', parent_name: '-', spouse_name: 'KARSODIKRO', child_order: 1, status: 'Almarhum / Almarhumah' },
  { id: '4', full_name: 'HARTO REJO', gender: 'Laki-laki', parent_name: 'KARSODIKRO', spouse_name: '-', child_order: 1, status: 'Almarhum / Almarhumah' },
  { id: '5', full_name: 'MAR JI YEM', gender: 'Laki-laki', parent_name: 'KARSODIKRO', spouse_name: '-', child_order: 2, status: 'Almarhum / Almarhumah' },
  { id: '6', full_name: 'PRAMUDJO S', gender: 'Laki-laki', parent_name: 'KARSODIKRO', spouse_name: '-', child_order: 3, status: 'Masih Hidup' },
  { id: '7', full_name: 'DARMO SUKARTO', gender: 'Laki-laki', parent_name: 'KARSODIKRO', spouse_name: '-', child_order: 4, status: 'Almarhum / Almarhumah' },
  { id: '8', full_name: 'RUBIKEM', gender: 'Perempuan', parent_name: 'DARMO SUKARTO', spouse_name: '-', child_order: 9, status: 'Masih Hidup' }
];

// Helper Convert File to Base64
const toBase64 = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result);
  reader.onerror = error => reject(error);
});

// Admin Mode Handler
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
  renderTree();
}

// Data Fetcher from Google Apps Script / Local Storage Fallback
async function loadMembers() {
  const loadingEl = document.getElementById('loading');
  if (loadingEl) loadingEl.style.display = 'block';

  try {
    const res = await fetch(SCRIPT_URL, { method: 'GET', redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

    const dataText = await res.text();
    membersData = JSON.parse(dataText);
    localStorage.setItem('familyTreeData', JSON.stringify(membersData));
  } catch (err) {
    console.warn("Gagal memuat dari Google Script, memuat dari Local Storage/Default:", err);
    const saved = localStorage.getItem('familyTreeData');
    membersData = saved ? JSON.parse(saved) : defaultFamilyData;
  } finally {
    if (loadingEl) loadingEl.style.display = 'none';
    renderTree();
    updateMemberDropdowns();
    updateGenerationSearchOptions();
  }
}

// Dropdown Popover Control
window.addEventListener('click', function(e) {
  if (!e.target.closest('.add-btn')) {
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

// Node HTML Card Generator
function createNodeHTML(member) {
  const isFemale = member.gender === 'Perempuan';
  const defaultAvatar = isFemale 
    ? 'https://cdn-icons-png.flaticon.com/512/4140/4140047.png' 
    : 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png';

  const photoSrc = member.photo_url || defaultAvatar;
  const isAlive = member.status === 'Masih Hidup';

  return `
    <div class="member-node ${isFemale ? 'female' : 'male'}">
      ${isAdmin ? `
        <div class="admin-action-btns">
          <button class="btn-admin edit" onclick="openMemberModal('edit', '${member.id}')" title="Edit">✏️</button>
          <button class="btn-admin del" onclick="deleteMember('${member.id}')" title="Hapus">🗑️</button>
        </div>
      ` : ''}
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
            <button class="dropdown-item" onclick="openAddRelativeModal('${member.id}', 'child')">
              <span>🧍</span> Tambah Anak
            </button>
            <button class="dropdown-item" onclick="openAddRelativeModal('${member.id}', 'spouse')">
              <span>🩷</span> Tambah Pasangan
            </button>
            <button class="dropdown-item" onclick="openAddRelativeModal('${member.id}', 'parent')">
              <span>👨‍👩‍👦</span> Tambah Orang Tua
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Tree Rendering Logic
function renderTree() {
  const container = document.getElementById('treeContainer');
  if (!container) return;
  container.innerHTML = '';

  if (!membersData || membersData.length === 0) {
    container.innerHTML = '<p style="color:#94a3b8; padding: 20px;">Belum ada data anggota keluarga.</p>';
    return;
  }

  const processedSet = new Set();
  const roots = membersData.filter(m => {
    return !m.parent_name || m.parent_name === '-' || !membersData.some(p => p.full_name === m.parent_name);
  });

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

  children.sort((a, b) => (parseInt(a.child_order) || 0) - (parseInt(b.child_order) || 0));

  if (children.length > 0) {
    const childrenUl = document.createElement('ul');
    children.forEach(child => {
      childrenUl.appendChild(buildTreeNode(child, processedSet));
    });
    li.appendChild(childrenUl);
  }

  return li;
}

// Relative Add Trigger with Context Setup
function openAddRelativeModal(targetMemberId, relationType) {
  const target = membersData.find(m => m.id === targetMemberId);
  if (!target) return;

  openMemberModal('add');

  const titleEl = document.getElementById('modalTitle');
  const genderSelect = document.getElementById('gender');
  const parentSelect = document.getElementById('parent_name');
  const spouseSelect = document.getElementById('spouse_name');

  if (relationType === 'spouse') {
    titleEl.innerText = `+ Tambah Pasangan untuk ${target.full_name}`;
    genderSelect.value = target.gender === 'Laki-laki' ? 'Perempuan' : 'Laki-laki';
    spouseSelect.value = target.full_name;
    parentSelect.value = '-';
  } else if (relationType === 'child') {
    titleEl.innerText = `+ Tambah Anak dari ${target.full_name}`;
    parentSelect.value = target.full_name;
    spouseSelect.value = '-';
  } else if (relationType === 'parent') {
    titleEl.innerText = `+ Tambah Orang Tua dari ${target.full_name}`;
    parentSelect.value = '-';
    spouseSelect.value = '-';
  }
}

// Modal Base Functions
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

// Form Submission & Two-Way Relationship Sync
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

  const fullName = document.getElementById('full_name').value.trim();
  const spouseName = document.getElementById('spouse_name').value;
  const parentName = document.getElementById('parent_name').value;

  const payload = {
    action: action,
    id: action === 'edit' ? document.getElementById('form_id').value : String(Date.now()),
    full_name: fullName,
    gender: document.getElementById('gender').value,
    parent_name: parentName,
    spouse_name: spouseName,
    child_order: document.getElementById('child_order').value,
    status: document.getElementById('status').value,
    photo_base64: photoBase64
  };

  try {
    await fetch(SCRIPT_URL, { 
      method: 'POST', 
      body: JSON.stringify(payload) 
    });
  } catch (err) {
    console.warn("Backend update bypassed/failed, handling locally:", err);
  }

  // Local Data Syncing (Two-Way Spouse Linking)
  if (action === 'add') {
    membersData.push(payload);
  } else {
    const idx = membersData.findIndex(m => m.id === payload.id);
    if (idx !== -1) membersData[idx] = payload;
  }

  // Two-Way Spouse Relation Sync
  if (spouseName && spouseName !== '-') {
    const spouseObj = membersData.find(m => m.full_name === spouseName);
    if (spouseObj) {
      spouseObj.spouse_name = fullName;
    }
  }

  localStorage.setItem('familyTreeData', JSON.stringify(membersData));
  
  alert(action === 'add' ? "Data berhasil disimpan!" : "Data berhasil diperbarui!");
  closeMemberModal();
  updateMemberDropdowns();
  updateGenerationSearchOptions();
  renderTree();

  btn.innerText = "Simpan Data";
  btn.disabled = false;
});

// Member Deletion
async function deleteMember(id) {
  if (!isAdmin) return;
  if (!confirm("Apakah Anda yakin ingin menghapus data anggota keluarga ini?")) return;

  try {
    await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({ action: "delete", id: id })
    });
  } catch (err) {
    console.warn("Backend deletion bypassed, removing locally.");
  }

  membersData = membersData.filter(m => m.id !== id);
  localStorage.setItem('familyTreeData', JSON.stringify(membersData));
  
  alert("Data berhasil dihapus!");
  renderTree();
  updateMemberDropdowns();
  updateGenerationSearchOptions();
}

// Details Modal
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

// Update Dropdowns
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

// Search Logic: Names & Generations with Descendants
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

  membersData.forEach(m => {
    const parent = byName.get(normalizeName(m.parent_name));
    if (!m.parent_name || m.parent_name === '-' || !parent) map.set(m.id, 1);
  });

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

function createSearchResultCard(member, generation, relationText) {
  const female = normalizeName(member.gender) === 'perempuan';
  const photo = getPhotoForMember(member);
  const defaultAvatar = female
    ? 'https://cdn-icons-png.flaticon.com/512/4140/4140047.png'
    : 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png';

  return `
    <div class="search-result-card ${female ? 'female' : 'male'}">
      <img class="search-result-avatar" src="${photo}" alt="${member.full_name}" onerror="this.src='${defaultAvatar}'">
      <div class="search-result-info">
        <div class="search-result-name" title="${member.full_name}">${member.full_name}</div>
        <div class="search-result-meta">${member.gender} • ${member.status} • Generasi ${generation}</div>
        <span class="search-result-relation">${relationText || `Generasi ${generation}`}</span>
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

// Inisialisasi Aplikasi Saat DOM Siap
document.addEventListener('DOMContentLoaded', () => {
  initFamilySearch();
  loadMembers();
});
