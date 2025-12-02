// app.js - Family Health (HTML/CSS/JS) - localStorage based
"use strict";

/* ---------- Data Layer ---------- */
const STORAGE_KEY = "familyHealth_members_v1";
let members = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

/* ---------- Helper Utilities ---------- */
function saveMembers(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
}

function uid(){ return Date.now() + Math.floor(Math.random()*999); }

function computeBMI(heightCm, weightKg){
  const h = parseFloat(heightCm);
  const w = parseFloat(weightKg);
  if (!h || !w) return null;
  const heightM = h / 100.0;
  const bmi = w / (heightM * heightM);
  return Math.round(bmi * 10) / 10;
}

function bmiCategory(bmi){
  if (bmi === null) return "—";
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

function fileToDataURL(file){
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ---------- DOM references ---------- */
const form = document.getElementById("memberForm");
const nameInput = document.getElementById("name");
const ageInput = document.getElementById("age");
const bloodInput = document.getElementById("blood");
const heightInput = document.getElementById("height");
const weightInput = document.getElementById("weight");
const notesInput = document.getElementById("notes");
const reportFileInput = document.getElementById("reportFile");
const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const memberList = document.getElementById("memberList");
const bmiValue = document.getElementById("bmiValue");
const bmiCategoryEl = document.getElementById("bmiCategory");
const modal = document.getElementById("modal");
const modalContent = document.getElementById("modalContent");
const searchInput = document.getElementById("search");
const clearAllBtn = document.getElementById("clearAll");

/* state for edit */
let editingId = null;

/* ---------- UI Actions ---------- */
function escapeHtml(s){
  if (!s) return "";
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]));
}

/* Render member list */
function renderList(filter = ""){
  memberList.innerHTML = "";
  const items = members.filter(m => m.name.toLowerCase().includes(filter.toLowerCase()));
  if (items.length === 0){
    memberList.innerHTML = `<div style="padding:18px;color:#065f46">কোনো সদস্য নেই — নতুন সদস্য যোগ করুন।</div>`;
    return;
  }

  items.forEach(m => {
    const el = document.createElement("div");
    el.className = "member-card";
    el.innerHTML = `
      <div class="member-top">
        <div>
          <div class="member-title">${escapeHtml(m.name)}</div>
          <div style="font-size:13px;color:#0b3b2b">${escapeHtml(m.blood)} • ${escapeHtml(m.age)} বছর</div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:700;color:#065f46">${m.bmi ?? "—"}</div>
          <div style="font-size:12px;color:#0b3b2b">${bmiCategory(m.bmi)}</div>
        </div>
      </div>
      <div class="meta">${escapeHtml(m.notes || "")}</div>
      <div class="member-actions">
        <button class="action-small action-edit">Edit</button>
        <button class="action-small action-view">View</button>
        <button class="action-small action-delete">Delete</button>
      </div>
    `;
    // Attach event listeners dynamically
    el.querySelector(".action-edit").addEventListener("click", () => startEdit(m.id));
    el.querySelector(".action-view").addEventListener("click", () => viewMember(m.id));
    el.querySelector(".action-delete").addEventListener("click", () => deleteMember(m.id));

    memberList.appendChild(el);
  });
}

/* ---------- Form: Add / Update ---------- */
async function addOrUpdateMember(){
  const name = nameInput.value.trim();
  const age = ageInput.value.trim();
  const blood = bloodInput.value.trim();
  const height = heightInput.value.trim();
  const weight = weightInput.value.trim();
  const notes = notesInput.value.trim();

  if (!name || !age || !height || !weight){
    alert("অনুগ্রহ করে নাম, বয়স, উচ্চতা ও ওজন দিন।");
    return;
  }

  const bmi = computeBMI(height, weight);

  const file = reportFileInput.files[0];
  let reportData = null;
  if (file){
    try {
      reportData = await fileToDataURL(file);
    } catch(e){
      console.warn("File read error", e);
    }
  }

  if (editingId){
    const idx = members.findIndex(x => x.id === editingId);
    if (idx === -1) { editingId = null; return; }
    members[idx] = {
      ...members[idx],
      name, age, blood, height, weight, notes, bmi,
      report: reportData ?? members[idx].report ?? null,
      updatedAt: new Date().toISOString()
    };
    editingId = null;
  } else {
    const newMember = {
      id: uid(),
      name, age, blood, height, weight, notes,
      bmi,
      report: reportData,
      createdAt: new Date().toISOString()
    };
    members.push(newMember);
  }

  saveMembers();
  renderList(searchInput.value);
  resetForm();
}

/* reset form */
function resetForm(){
  form.reset();
  editingId = null;
  bmiValue.textContent = "—";
  bmiCategoryEl.textContent = "—";
}

/* start edit */
function startEdit(id){
  const m = members.find(x => x.id === id);
  if (!m) return;
  editingId = id;
  nameInput.value = m.name;
  ageInput.value = m.age;
  bloodInput.value = m.blood;
  heightInput.value = m.height;
  weightInput.value = m.weight;
  notesInput.value = m.notes || "";
  bmiValue.textContent = (m.bmi ?? "—");
  bmiCategoryEl.textContent = bmiCategory(m.bmi);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* delete member */
function deleteMember(id){
  if (!confirm("সর্বদা ডিলিট করতে চান?")) return;
  members = members.filter(m => m.id !== id);
  saveMembers();
  renderList(searchInput.value);
}

/* view / modal */
function viewMember(id){
  const m = members.find(x => x.id === id);
  if (!m) return;
  let html = `<h3 style="margin-bottom:8px">${escapeHtml(m.name)}</h3>`;
  html += `<div><strong>বয়স:</strong> ${escapeHtml(m.age)} বছর</div>`;
  html += `<div><strong>রক্ত গ্রুপ:</strong> ${escapeHtml(m.blood)}</div>`;
  html += `<div><strong>উচ্চতা:</strong> ${escapeHtml(m.height)} সেমি</div>`;
  html += `<div><strong>ওজন:</strong> ${escapeHtml(m.weight)} কেজি</div>`;
  html += `<div style="margin-top:8px"><strong>BMI:</strong> ${m.bmi ?? "—"} (${bmiCategory(m.bmi)})</div>`;
  if (m.notes) html += `<div style="margin-top:8px"><strong>নোট:</strong> ${escapeHtml(m.notes)}</div>`;

  if (m.report){
    if (m.report.startsWith("data:application/pdf")){
      html += `<div style="margin-top:12px"><strong>রিপোর্ট (PDF):</strong><br><a href="${m.report}" target="_blank">Open PDF</a></div>`;
    } else {
      html += `<div style="margin-top:12px"><strong>রিপোর্ট (Image):</strong><br><img src="${m.report}" alt="report" style="max-width:100%;border-radius:8px;margin-top:8px;border:1px solid #e6f8f2" /></div>`;
    }
  } else {
    html += `<div style="margin-top:12px;color:#065f46">কোনো রিপোর্ট নেই</div>`;
  }

  html += `<div style="margin-top:14px;display:flex;gap:8px"><button class="btn primary" onclick="startEdit(${m.id});closeModal();">Edit</button><button class="btn ghost" onclick="closeModal();">Close</button></div>`;

  modalContent.innerHTML = html;
  openModal();
}

function openModal(){ modal.classList.remove("hidden"); }
function closeModal(){ modal.classList.add("hidden"); modalContent.innerHTML = ""; }

/* clear all */
function clearAll(){
  if (!confirm("সকল সদস্য এবং ডেটা মুছে ফেলতে চান? (এই ক্রিয়া অপরিবর্তনীয়)")) return;
  members = [];
  saveMembers();
  renderList();
}

/* live BMI preview */
function updateBMIPreview(){
  const h = heightInput.value;
  const w = weightInput.value;
  const bmi = computeBMI(h,w);
  if (bmi === null){ bmiValue.textContent = "—"; bmiCategoryEl.textContent = "—"; }
  else { bmiValue.textContent = bmi; bmiCategoryEl.textContent = bmiCategory(bmi); }
}

/* ---------- Event bindings ---------- */
saveBtn.addEventListener("click", addOrUpdateMember);
resetBtn.addEventListener("click", resetForm);
searchInput.addEventListener("input", e => renderList(e.target.value));
clearAllBtn.addEventListener("click", clearAll);
heightInput.addEventListener("input", updateBMIPreview);
weightInput.addEventListener("input", updateBMIPreview);
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

/* initial render */
document.addEventListener("DOMContentLoaded", () => {
  renderList();
});
