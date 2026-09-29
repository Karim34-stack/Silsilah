/* =========================================================
   SILSILAH KELUARGA - FRONTEND
   Struktur database TIDAK diubah:
   id, full_name, gender, parent_name, spouse_name,
   child_order, status, photo_url
   ========================================================= */

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxK_oVv7EJj3C1rY4IlO5TWxp-N7-NCiRD6CCc27jBbline6DAwjKh2Yc4I5DSnOFT7PQ/exec";

let isAdmin = false;
let membersData = [];
let pendingRelation = null;

const $ = id => document.getElementById(id);

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHTML(value).replace(/`/g, "&#096;");
}

const toBase64 = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
});

function normalizeMember(raw) {
  return {
    id: raw?.id != null ? String(raw.id) : "",
    full_name: raw?.full_name != null ? String(raw.full_name) : "",
    gender: raw?.gender != null ? String(raw.gender) : "Laki-laki",
    parent_name: raw?.parent_name ? String(raw.parent_name) : "-",
    spouse_name: raw?.spouse_name ? String(raw.spouse_name) : "-",
    child_order: raw?.child_order != null && raw.child_order !== "" ? raw.child_order : "",
    status: raw?.status != null ? String(raw.status) : "Masih Hidup",
    photo_url: raw?.photo_url ? String(raw.photo_url) : ""
  };
}

function getPhotoSrc(url, gender) {
  const defaultAvatar = gender === "Perempuan"
    ? "https://cdn-icons-png.flaticon.com/512/4140/4140047.png"
    : "https://cdn-icons-png.flaticon.com/512/4140/4140037.png";

  if (!url) return defaultAvatar;

  const value = String(url).trim();

  // Dukungan untuk URL Google Drive yang umum.
  const idMatch =
    value.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
    value.match(/[?&]id=([a-zA-Z0-9_-]+)/);

  if (idMatch) {
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(idMatch[1])}&sz=w500`;
  }

  return value;
}

function showError(message) {
  const box = $("errorBox");
  if (!box) return;
  box.textContent = message;
  box.hidden = false;
}

function hideError() {
  const box = $("errorBox");
  if (box) box.hidden = true;
}

function toggleAdmin() {
  if (!isAdmin) {
    const pass = prompt("Masukkan Password Admin:");
    if (pass !== "1234") {
      alert("Password salah!");
      return;
    }
    isAdmin = true;
    alert("Login Admin Berhasil!");
  } else {
    isAdmin = false;
  }

  $("role-status").innerText = isAdmin
    ? "Mode: ADMIN (Full Control)"
    : "Mode: Member (Tambah Saja)";

  document.body.classList.toggle("admin-mode", isAdmin);
  renderTree();
}

async function loadMembers() {
  const loadingEl = $("loading");
  if (loadingEl) loadingEl.style.display = "block";
  hideError();

  try {
    const response = await fetch(SCRIPT_URL, {
      method: "GET",
      redirect: "follow",
      cache: "no-store"
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const text = await response.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Respons API bukan JSON. Periksa deployment Google Apps Script.");
    }

    if (!Array.isArray(data)) {
      if (Array.isArray(data.data)) data = data.data;
      else if (Array.isArray(data.members)) data = data.members;
      else throw new Error("Format data API tidak berupa array.");
    }

    membersData = data.map(normalizeMember).filter(m => m.id || m.full_name);

    renderTree();
    updateMemberDropdowns();
  } catch (err) {
    console.error("Error Fetching Data:", err);
    showError("Gagal memuat data silsilah. Periksa URL Web App Apps Script, akses 'Anyone', dan deployment versi terbaru.");
    $("treeContainer").innerHTML = "";
  } finally {
    if (loadingEl) loadingEl.style.display = "none";
  }
}

function toggleDropdown(id) {
  document.querySelectorAll(".dropdown-menu").forEach(menu => {
    if (menu.id !== `dropdown-${id}`) menu.classList.remove("show");
  });

  const current = $(`dropdown-${id}`);
  if (current) current.classList.toggle("show");
}

window.addEventListener("click", event => {
  if (!event.target.closest(".relative-dropdown")) {
    document.querySelectorAll(".dropdown-menu").forEach(menu => menu.classList.remove("show"));
  }
});

function openRelativeModal(memberId, relationType) {
  pendingRelation = { memberId: String(memberId), relationType };
  document.querySelectorAll(".dropdown-menu").forEach(menu => menu.classList.remove("show"));
  openMemberModal("add", null, pendingRelation);
}

function createNodeHTML(member) {
  const isFemale = member.gender === "Perempuan";
  const isAlive = member.status === "Masih Hidup";
  const photoSrc = getPhotoSrc(member.photo_url, member.gender);

  return `
    <div class="member-node ${isFemale ? "female" : "male"}">
      <div class="admin-action-btns">
        ${isAdmin ? `
          <button type="button" class="btn-admin edit" title="Edit"
            onclick="openMemberModal('edit','${escapeAttr(member.id)}')">✏️</button>
          <button type="button" class="btn-admin del" title="Hapus"
            onclick="deleteMember('${escapeAttr(member.id)}')">🗑️</button>
        ` : ""}
      </div>

      <div class="node-header">
        <img
          src="${escapeAttr(photoSrc)}"
          class="node-avatar"
          alt="${escapeAttr(member.full_name)}"
          title="Klik untuk memperbesar"
          onclick="openImageModal('${escapeAttr(photoSrc)}','${escapeAttr(member.full_name)}')"
          onerror="this.onerror=null;this.src='${getPhotoSrc("", member.gender)}'">
        <div class="node-info">
          <div class="node-name" title="${escapeAttr(member.full_name)}">${escapeHTML(member.full_name)}</div>
          <div class="badges">
            <span class="badge-tag ${isFemale ? "bg-female" : "bg-male"}">${escapeHTML(member.gender)}</span>
            <span class="badge-tag ${isAlive ? "bg-alive" : "bg-dead"}">${isAlive ? "Hidup" : "Wafat"}</span>
          </div>
        </div>
      </div>

      <div class="node-actions">
        <button type="button" class="btn-link" onclick="showDetail('${escapeAttr(member.id)}')">Detail Kerabat</button>
        <div class="relative-dropdown">
          <button type="button" class="btn-link add-btn" onclick="toggleDropdown('${escapeAttr(member.id)}')">+ Kerabat</button>
          <div class="dropdown-menu" id="dropdown-${escapeAttr(member.id)}">
            <button type="button" class="dropdown-item" onclick="openRelativeModal('${escapeAttr(member.id)}','child')">
              <span>🧍</span> Tambah Anak
            </button>
            <button type="button" class="dropdown-item" onclick="openRelativeModal('${escapeAttr(member.id)}','spouse')">
              <span>🩷</span> Tambah Pasangan
            </button>
            <button type="button" class="dropdown-item" onclick="openRelativeModal('${escapeAttr(member.id)}','parent')">
              <span>👨‍👩‍👦</span> Tambah Orang Tua
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function sortByChildOrder(a, b) {
  const aa = Number.parseInt(a.child_order, 10);
  const bb = Number.parseInt(b.child_order, 10);

  if (Number.isNaN(aa) && Number.isNaN(bb)) {
    return a.full_name.localeCompare(b.full_name, "id");
  }
  if (Number.isNaN(aa)) return 1;
  if (Number.isNaN(bb)) return -1;

  return aa - bb; // Anak pertama/tua ditampilkan lebih dahulu.
}

function renderTree() {
  const container = $("treeContainer");
  if (!container) return;

  container.innerHTML = "";

  if (!membersData.length) {
    container.innerHTML = '<p style="color:#94a3b8;padding:20px;">Belum ada data anggota keluarga.</p>';
    return;
  }

  const processed = new Set();

  // Akar: tidak memiliki orang tua yang tercatat di dataset.
  const roots = membersData.filter(member => {
    const parent = String(member.parent_name || "").trim();
    return !parent || parent === "-" ||
      !membersData.some(p => p.full_name.trim().toLowerCase() === parent.toLowerCase());
  });

  const rootNames = new Set(roots.map(r => r.full_name.toLowerCase()));
  const orderedRoots = [...roots].sort((a, b) => {
    // Root tidak dipaksa berdasarkan child_order; gunakan nama sebagai fallback stabil.
    return a.full_name.localeCompare(b.full_name, "id");
  });

  const ul = document.createElement("ul");

  orderedRoots.forEach(root => {
    if (!processed.has(root.full_name.toLowerCase())) {
      ul.appendChild(buildTreeNode(root, processed));
    }
  });

  // Data yang tidak terhubung tetap ditampilkan agar tidak hilang dari katalog.
  membersData
    .filter(m => !processed.has(m.full_name.toLowerCase()))
    .sort(sortByChildOrder)
    .forEach(member => ul.appendChild(buildTreeNode(member, processed)));

  container.appendChild(ul);
}

function buildTreeNode(member, processed) {
  const key = member.full_name.toLowerCase();
  if (processed.has(key)) return document.createElement("li");
  processed.add(key);

  const li = document.createElement("li");
  const coupleWrapper = document.createElement("div");
  coupleWrapper.className = "couple-wrapper";
  coupleWrapper.innerHTML = createNodeHTML(member);

  let spouseMember = null;
  const spouseName = String(member.spouse_name || "").trim();

  if (spouseName && spouseName !== "-") {
    spouseMember = membersData.find(m =>
      m.full_name.trim().toLowerCase() === spouseName.toLowerCase()
    );

    if (spouseMember && !processed.has(spouseMember.full_name.toLowerCase())) {
      processed.add(spouseMember.full_name.toLowerCase());
      coupleWrapper.insertAdjacentHTML(
        "beforeend",
        `<span class="heart-icon">🩷</span>${createNodeHTML(spouseMember)}`
      );
    }
  }

  li.appendChild(coupleWrapper);

  const parentNames = [member.full_name];
  if (spouseMember) parentNames.push(spouseMember.full_name);

  const children = membersData
    .filter(m => {
      const parent = String(m.parent_name || "").trim().toLowerCase();
      return parentNames.some(name => parent === name.trim().toLowerCase()) &&
        !processed.has(m.full_name.toLowerCase());
    })
    .sort(sortByChildOrder);

  if (children.length) {
    const childrenUl = document.createElement("ul");
    children.forEach(child => childrenUl.appendChild(buildTreeNode(child, processed)));
    li.appendChild(childrenUl);
  }

  return li;
}

function openMemberModal(mode, id = null, relation = null) {
  const form = $("memberForm");
  if (!form) return;

  form.reset();
  $("form_action").value = mode;
  $("form_id").value = "";
  pendingRelation = relation || null;

  updateMemberDropdowns();

  if (mode === "add") {
    $("modalTitle").innerText = "+ Tambah Anggota Keluarga";

    if (relation?.memberId) {
      const target = membersData.find(m => String(m.id) === String(relation.memberId));

      if (target) {
        if (relation.relationType === "child") {
          $("modalTitle").innerText = `+ Tambah Anak dari ${target.full_name}`;
          setSelectValue("parent_name", target.full_name);
        } else if (relation.relationType === "spouse") {
          $("modalTitle").innerText = `+ Tambah Pasangan dari ${target.full_name}`;
          setSelectValue("spouse_name", target.full_name);
          $("gender").value = target.gender === "Laki-laki" ? "Perempuan" : "Laki-laki";
        } else if (relation.relationType === "parent") {
          $("modalTitle").innerText = `+ Tambah Orang Tua dari ${target.full_name}`;
          // Database hanya memiliki satu field parent_name.
          // Relasi yang tersedia tetap menggunakan field parent_name tanpa menambah kolom baru.
          setSelectValue("parent_name", "-");
        }
      }
    }
  }

  if (mode === "edit") {
    if (!isAdmin) return;

    const member = membersData.find(m => String(m.id) === String(id));
    if (!member) return;

    $("modalTitle").innerText = "Edit Data Anggota";
    $("form_id").value = member.id;
    $("full_name").value = member.full_name;
    $("gender").value = member.gender;
    setSelectValue("parent_name", member.parent_name || "-");
    setSelectValue("spouse_name", member.spouse_name || "-");
    $("child_order").value = member.child_order || "";
    $("status").value = member.status || "Masih Hidup";
  }

  const modal = $("memberModal");
  modal.style.display = "flex";
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
  $("full_name").focus();
}

function setSelectValue(id, value) {
  const select = $(id);
  if (!select) return;

  const exists = Array.from(select.options).some(opt => opt.value === value);
  select.value = exists ? value : "-";
}

function closeMemberModal() {
  const modal = $("memberModal");
  if (!modal) return;
  modal.style.display = "none";
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
  pendingRelation = null;
}

async function submitMemberForm(event) {
  event.preventDefault();

  const btn = $("btnSubmit");
  const action = $("form_action").value;
  const fileInput = $("photo_file");
  let photoBase64 = "";

  try {
    btn.disabled = true;

    if (fileInput.files.length) {
      const file = fileInput.files[0];

      if (!file.type.startsWith("image/")) {
        alert("File yang dipilih harus berupa gambar.");
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        alert("Ukuran foto terlalu besar! Maksimal 2MB.");
        return;
      }

      btn.innerText = "Mengunggah Foto...";
      photoBase64 = await toBase64(file);
    } else {
      btn.innerText = "Menyimpan Data...";
    }

    const payload = {
      action,
      id: $("form_id").value,
      full_name: $("full_name").value.trim(),
      gender: $("gender").value,
      parent_name: $("parent_name").value || "-",
      spouse_name: $("spouse_name").value || "-",
      child_order: $("child_order").value,
      status: $("status").value,
      photo_base64: photoBase64
    };

    if (!payload.full_name) {
      alert("Nama lengkap wajib diisi.");
      return;
    }

    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload),
      redirect: "follow"
    });

    const responseText = await response.text();
    let result = null;

    try {
      result = JSON.parse(responseText);
    } catch {
      // Beberapa deployment Apps Script mengembalikan teks kosong/HTML.
      // Status HTTP tetap digunakan sebagai fallback.
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    if (result && result.success === false) {
      throw new Error(result.message || "Server menolak permintaan.");
    }

    // Jika penambahan berasal dari tombol + Kerabat, lengkapi relasi dua arah
    // menggunakan field database yang sudah ada. Tidak ada kolom baru.
    if (action === "add" && pendingRelation?.memberId &&
        (pendingRelation.relationType === "spouse" || pendingRelation.relationType === "parent")) {

      const target = membersData.find(m => String(m.id) === String(pendingRelation.memberId));

      if (target) {
        const relationPayload = {
          action: "edit",
          id: target.id,
          full_name: target.full_name,
          gender: target.gender,
          parent_name: target.parent_name || "-",
          spouse_name: target.spouse_name || "-",
          child_order: target.child_order || "",
          status: target.status || "Masih Hidup",
          photo_base64: ""
        };

        if (pendingRelation.relationType === "spouse") {
          relationPayload.spouse_name = payload.full_name;
        } else if (pendingRelation.relationType === "parent") {
          relationPayload.parent_name = payload.full_name;
        }

        const relationResponse = await fetch(SCRIPT_URL, {
          method: "POST",
          body: JSON.stringify(relationPayload),
          redirect: "follow"
        });

        if (!relationResponse.ok) {
          console.warn("Data baru tersimpan, tetapi relasi dua arah gagal diperbarui.");
        }
      }
    }

    alert(action === "add" ? "Data berhasil disimpan!" : "Data berhasil diperbarui!");
    closeMemberModal();
    await loadMembers();
  } catch (err) {
    console.error("Error submit:", err);
    alert(`Gagal menyimpan data.\n${err.message || "Periksa koneksi/API Apps Script."}`);
  } finally {
    btn.innerText = "Simpan Data";
    btn.disabled = false;
  }
}

async function deleteMember(id) {
  if (!isAdmin) {
    alert("Hanya Admin yang dapat menghapus data.");
    return;
  }

  const member = membersData.find(m => String(m.id) === String(id));
  if (!member) return;

  if (!confirm(`Hapus data "${member.full_name}"?`)) return;

  try {
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "delete", id: id }),
      redirect: "follow"
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    alert("Data berhasil dihapus!");
    await loadMembers();
  } catch (err) {
    console.error(err);
    alert("Gagal menghapus data. Periksa koneksi/API Apps Script.");
  }
}

function showDetail(id) {
  const member = membersData.find(m => String(m.id) === String(id));
  if (!member) return;

  alert(
    `📌 DETAIL KERABAT:\n\n` +
    `Nama Lengkap: ${member.full_name}\n` +
    `Jenis Kelamin: ${member.gender}\n` +
    `Orang Tua: ${member.parent_name || "-"}\n` +
    `Pasangan: ${member.spouse_name || "-"}\n` +
    `Anak Ke-: ${member.child_order || "-"}\n` +
    `Status: ${member.status}`
  );
}

function updateMemberDropdowns() {
  document.querySelectorAll(".member-dropdown").forEach(select => {
    const currentValue = select.value;
    const isParent = select.id === "parent_name";

    select.innerHTML = isParent
      ? '<option value="-">-- Pilih Orang Tua (Jika ada) --</option>'
      : '<option value="-">-- Pilih Pasangan (Jika ada) --</option>';

    membersData.forEach(member => {
      const option = document.createElement("option");
      option.value = member.full_name;
      option.textContent = member.full_name;
      select.appendChild(option);
    });

    if (currentValue) setSelectValue(select.id, currentValue);
  });
}

function openImageModal(src, name) {
  const modal = $("imageModal");
  const img = $("largeImage");
  const caption = $("largeImageCaption");

  if (!modal || !img) return;

  img.src = src;
  img.alt = name || "Foto anggota keluarga";
  caption.textContent = name || "";
  modal.style.display = "flex";
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
}

function closeImageModal(event) {
  if (event && event.target && event.target !== $("imageModal") &&
      !event.target.classList.contains("image-close")) {
    return;
  }

  const modal = $("imageModal");
  if (!modal) return;

  modal.style.display = "none";
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
  $("largeImage").src = "";
}

document.addEventListener("DOMContentLoaded", () => {
  $("memberForm")?.addEventListener("submit", submitMemberForm);

  document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", event => {
      if (event.target === modal) {
        if (modal.id === "memberModal") closeMemberModal();
        if (modal.id === "imageModal") closeImageModal({ target: modal });
      }
    });
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeMemberModal();
      closeImageModal({ target: $("imageModal") });
    }
  });

  loadMembers();
});
