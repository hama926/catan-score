import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// ===== Supabase =====
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const PIECE_COLORS = [
  { id: "blue",   label: "青", hex: "#1565C0", light: "#42A5F5" },
  { id: "white",  label: "白", hex: "#C5CDD2", light: "#EDF0F2" },
  { id: "orange", label: "橙", hex: "#E65100", light: "#FFA726" },
  { id: "red",    label: "赤", hex: "#B71C1C", light: "#EF5350" },
  { id: "green",  label: "緑", hex: "#1B5E20", light: "#66BB6A" },
  { id: "brown",  label: "茶", hex: "#4E342E", light: "#A1887F" },
];

const EDITIONS = [
  { value: "スタンダード",         label: "🏝 スタンダード版",       scenarios: [] },
  { value: "航海者版", label: "⚓ 航海者版（海カタン）", scenarios: ["1. 新しい岸辺へ","2. 四つの島（拡張版：六つの島）","3. オセアニア","4. 砂漠を越えて","5. 忘れられた一族","6. カタンの布地","7. 海賊島","8. カタンの名跡","9. 新たな世界"] },
  { value: "都市と騎士版",         label: "🏰 都市と騎士版",         scenarios: [] },
  { value: "商人と蛮族版",         label: "⚔️ 商人と蛮族版",         scenarios: ["カタンの漁師","カタンの河川","キャラバンの行列","蛮族の来襲","商人と蛮族"] },
  { value: "探検者と海賊版",       label: "🧭 探検者と海賊版",       scenarios: ["はじめの一歩","漁場の発見","スパイス諸島","海賊の巣窟","全部入り"] },
  { value: "宇宙開拓者版",         label: "🚀 宇宙開拓者版",         scenarios: [] },
  { value: "アメリカの開拓者たち", label: "🚂 アメリカの開拓者たち", scenarios: [] },
  { value: "歴史シナリオ",         label: "📜 歴史シナリオ",         scenarios: ["アレキサンダー大王","クフ王"] },
];

const FALLBACK_COLOR = { hex: "#c8906a", light: "#e8b880", label: "未設定" };

const defaultPlayer = (i) => ({ name: `プレイヤー${i + 1}`, colorId: null, finalScore: 0, longestRoad: false, largestArmy: false, strategy: "" });
const getColor = (colorId) => colorId ? (PIECE_COLORS.find(c => c.id === colorId) || null) : null;
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

// ===== Supabase CRUD =====
async function fetchHistory(roomCode) {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("room_code", roomCode)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(row => ({ ...row.data, id: row.id }));
}

async function insertRecord(roomCode, record) {
  const { error } = await supabase
    .from("games")
    .insert({ room_code: roomCode, data: record });
  if (error) throw error;
}

async function deleteRecord(id) {
  const { error } = await supabase
    .from("games")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

async function updateRecord(id, record) {
  const { error } = await supabase
    .from("games")
    .update({ data: record })
    .eq("id", id);
  if (error) throw error;
}

// メンバーはlocalStorageに保存（室コードごと）
function loadMembers(roomCode) {
  try { const v = localStorage.getItem(`catan_members_${roomCode}`); return v ? JSON.parse(v) : []; }
  catch { return []; }
}
function saveMembers(roomCode, m) {
  try { localStorage.setItem(`catan_members_${roomCode}`, JSON.stringify(m)); } catch {}
}

const labelStyle = { display: "block", color: "#8a5030", fontSize: 10, fontFamily: "'Cinzel', serif", letterSpacing: 1, marginBottom: 4, textTransform: "uppercase" };
const selectStyle = { background: "#fdf6ec", border: "1px solid #c8906a", borderRadius: 6, color: "#5a2e10", padding: "6px 8px", fontSize: 13, outline: "none", width: "100%" };

// ===== ルームログイン画面 =====
function RoomLogin({ onLogin }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const trimmed = code.trim();
    if (!trimmed) { setError("合言葉を入力してください"); return; }
    if (trimmed.length < 3) { setError("3文字以上で入力してください"); return; }
    setLoading(true);
    setError("");
    try {
      // 接続確認として一件だけ取得してみる
      await fetchHistory(trimmed);
      // セッションに保存
      sessionStorage.setItem("catan_room", trimmed);
      onLogin(trimmed);
    } catch (e) {
      setError("接続エラーが発生しました。環境変数を確認してください。");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(175deg, #f5ede0 0%, #eedcc8 40%, #e8d0b4 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Noto Serif JP', serif", padding: 24 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Noto+Serif+JP:wght@400;600;700&display=swap');*{box-sizing:border-box}`}</style>

      {/* ヘッダーロゴ */}
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 14 }}>
          <svg width="48" height="48" viewBox="0 0 42 42" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))" }}>
            <rect x="2" y="2" width="38" height="38" rx="7" fill="#F5C518" stroke="#C8980A" strokeWidth="1.5"/>
            {[[12,12],[30,30]].map(([cx,cy],i) => <circle key={i} cx={cx} cy={cy} r="4.5" fill="#1a1000"/>)}
          </svg>
          <svg width="48" height="48" viewBox="0 0 42 42" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))" }}>
            <rect x="2" y="2" width="38" height="38" rx="7" fill="#D62C1A" stroke="#9e1a0a" strokeWidth="1.5"/>
            {[[11,11],[31,11],[21,21],[11,31],[31,31]].map(([cx,cy],i) => <circle key={i} cx={cx} cy={cy} r="4" fill="#fff"/>)}
          </svg>
        </div>
        <h1 style={{ margin: 0, fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 26, letterSpacing: 4, color: "#8e2a0a", textShadow: "0 2px 4px rgba(140,50,10,0.15)" }}>CATAN SCORE</h1>
        <p style={{ margin: "6px 0 0", color: "#b07040", fontSize: 12, letterSpacing: 3, fontFamily: "'Cinzel', serif" }}>FAMILY BATTLE RECORD</p>
      </div>

      {/* ログインカード */}
      <div style={{ background: "#fff8f0", border: "2px solid #d4a880", borderRadius: 16, padding: "32px 28px", width: "100%", maxWidth: 380, boxShadow: "0 8px 32px rgba(140,80,20,0.15)" }}>
        <div style={{ color: "#8e2a0a", fontFamily: "'Cinzel', serif", fontSize: 13, fontWeight: 700, letterSpacing: 2, marginBottom: 8, textAlign: "center" }}>🔑 ROOM CODE</div>
        <p style={{ color: "#8a5030", fontSize: 12, textAlign: "center", marginBottom: 20, lineHeight: 1.7 }}>
          家族だけの合言葉を入力してください<br/>
          <span style={{ color: "#b07040", fontSize: 11 }}>（例: catan2024 / tanaka家）</span>
        </p>

        <input
          value={code}
          onChange={e => { setCode(e.target.value); setError(""); }}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
          placeholder="合言葉を入力..."
          autoFocus
          style={{ ...selectStyle, fontSize: 18, textAlign: "center", padding: "12px", letterSpacing: 3, marginBottom: 12, fontFamily: "'Cinzel', serif", fontWeight: 700, border: error ? "2px solid #D62C1A" : "2px solid #c8906a" }}
        />

        {error && (
          <div style={{ color: "#D62C1A", fontSize: 12, textAlign: "center", marginBottom: 10, fontFamily: "'Noto Serif JP', serif" }}>⚠️ {error}</div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{ width: "100%", padding: "13px 0", borderRadius: 10, background: loading ? "#e8d0b4" : "linear-gradient(135deg,#c0392b,#e74c3c)", border: "none", cursor: loading ? "wait" : "pointer", color: loading ? "#b07040" : "#fff", fontFamily: "'Cinzel', serif", fontSize: 14, fontWeight: 700, letterSpacing: 2, boxShadow: loading ? "none" : "0 4px 15px #c0392b55", transition: "all .3s" }}
        >
          {loading ? "⏳ 接続中..." : "⚔️ 入室する"}
        </button>

        <div style={{ marginTop: 20, padding: "12px 14px", background: "#fdf6ec", borderRadius: 8, border: "1px solid #e8c8a0" }}>
          <div style={{ color: "#8a5030", fontSize: 10, fontFamily: "'Cinzel', serif", fontWeight: 700, marginBottom: 6, letterSpacing: 1 }}>💡 TIPS</div>
          <ul style={{ margin: 0, paddingLeft: 16, color: "#a06840", fontSize: 11, lineHeight: 1.8 }}>
            <li>合言葉が同じなら家族みんなが同じ履歴を共有できます</li>
            <li>新しい合言葉を入力すると新しい部屋が自動作成されます</li>
            <li>英数字・ひらがな・記号どれでもOK</li>
          </ul>
        </div>
      </div>

      <div style={{ marginTop: 20, color: "#c8906a", fontSize: 10, fontFamily: "'Cinzel', serif", letterSpacing: 1 }}>
        CATAN SCORE · Made with ♥
      </div>
    </div>
  );
}

// ===== 以下は元のコンポーネント群（変更なし） =====

function ColorPicker({ value, usedColors, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {PIECE_COLORS.map(c => {
        const isSelected = c.id === value;
        const isUsed = usedColors.includes(c.id) && !isSelected;
        return (
          <button key={c.id} onClick={() => !isUsed && onChange(c.id)} title={c.label} style={{
            width: 30, height: 30, borderRadius: "50%", background: c.hex,
            border: isSelected ? "3px solid #D62C1A" : isUsed ? "2px solid #d4a880" : `2px solid ${c.light}66`,
            cursor: isUsed ? "not-allowed" : "pointer", opacity: isUsed ? 0.3 : 1,
            boxShadow: isSelected ? "0 0 8px #D62C1A88" : "0 1px 3px rgba(0,0,0,0.15)",
            transition: "all .15s", position: "relative", flexShrink: 0,
          }}>
            {c.id === "white" && <div style={{ position: "absolute", inset: 4, borderRadius: "50%", background: "transparent", border: "1px solid #9EADB4" }} />}
          </button>
        );
      })}
    </div>
  );
}

function StarRating({ value, max = 15, onChange, color = "#c0392b" }) {
  return (
    <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
      {Array.from({ length: max }, (_, i) => (
        <button key={i} onClick={() => onChange(i + 1)} style={{
          width: 26, height: 26, borderRadius: 4,
          background: i < value ? color : "#f0e0d0",
          border: i < value ? `1px solid ${color}` : "1px solid #c8906a",
          cursor: "pointer", fontSize: 12, color: i < value ? "#fff" : "#b07040",
          transition: "all .15s", fontWeight: 700,
        }}>{i + 1}</button>
      ))}
    </div>
  );
}

function Toggle({ active, onClick, label, color }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: "6px 4px", borderRadius: 6, cursor: "pointer",
      background: active ? `${color}22` : "#fdf6ec",
      border: `1px solid ${active ? color : "#c8906a"}`,
      color: active ? color : "#8a5030", fontSize: 11, fontWeight: 600,
      transition: "all .2s", fontFamily: "'Noto Serif JP', serif",
    }}>{label}</button>
  );
}

function PlayerCard({ player, onChange, winner, usedColors, knownMembers, onAddMember }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const color = getColor(player.colorId);
  const borderColor = color ? color.hex : "#c8906a";
  const accentColor = color ? color.hex : "#8a5030";
  const dropRef = useRef();

  useEffect(() => {
    if (!showDropdown) return;
    const h = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showDropdown]);

  const selectMember = (name) => { onChange({ ...player, name }); setShowDropdown(false); };
  const handleNameBlur = () => { if (player.name.trim() && !knownMembers.includes(player.name.trim())) onAddMember(player.name.trim()); };

  return (
    <div style={{ background: "linear-gradient(135deg, #fff8f0 0%, #fdf0e0 100%)", border: `2px solid ${borderColor}`, borderRadius: 12, padding: "16px 18px", position: "relative", boxShadow: winner ? `0 0 22px ${borderColor}66` : "0 2px 8px rgba(160,80,20,0.12)", transition: "box-shadow .3s" }}>
      {winner && <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: "#D62C1A", color: "#fff", fontFamily: "'Cinzel', serif", fontSize: 11, fontWeight: 700, padding: "3px 14px", borderRadius: 20, letterSpacing: 1, whiteSpace: "nowrap", boxShadow: "0 2px 8px #D62C1A66" }}>👑 WINNER</div>}

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, background: color ? `radial-gradient(circle at 35% 35%, ${color.light}, ${color.hex})` : "#e8d0b4", boxShadow: color ? `0 0 10px ${color.hex}66, inset 0 -2px 4px rgba(0,0,0,0.3)` : "inset 0 1px 3px rgba(0,0,0,0.15)", border: `2px solid ${color ? color.light + "88" : "#c8906a"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {!color && <span style={{ fontSize: 16, color: "#b07040", fontWeight: 700 }}>?</span>}
        </div>
        <div style={{ flex: 1, position: "relative" }} ref={dropRef}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input value={player.name} onChange={e => onChange({ ...player, name: e.target.value })} onBlur={handleNameBlur} onFocus={() => knownMembers.length > 0 && setShowDropdown(true)}
              style={{ flex: 1, background: "transparent", border: "none", borderBottom: `1px solid ${borderColor}88`, color: "#3a1800", fontFamily: "'Cinzel', serif", fontSize: 15, fontWeight: 700, outline: "none", padding: "2px 0" }} />
            {knownMembers.length > 0 && <button onClick={() => setShowDropdown(v => !v)} style={{ background: "none", border: "none", color: "#b07040", cursor: "pointer", fontSize: 12, padding: "0 2px" }}>▾</button>}
          </div>
          {showDropdown && knownMembers.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "#fdf6ec", border: "1px solid #c8906a", borderRadius: 8, overflow: "hidden", boxShadow: "0 8px 24px rgba(120,50,10,0.2)", marginTop: 4 }}>
              {knownMembers.map(name => (
                <button key={name} onMouseDown={() => selectMember(name)} style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", border: "none", color: player.name === name ? accentColor : "#5a2e10", fontFamily: "'Noto Serif JP', serif", fontSize: 13, cursor: "pointer", background: player.name === name ? `${accentColor}18` : "transparent", borderLeft: player.name === name ? `3px solid ${accentColor}` : "3px solid transparent" }}>{name}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>駒の色</label>
        <ColorPicker value={player.colorId} usedColors={usedColors} onChange={colorId => onChange({ ...player, colorId })} />
        <div style={{ color: color ? color.hex : "#b07040", fontSize: 10, marginTop: 4, fontFamily: "'Cinzel', serif", fontWeight: 700 }}>{color ? `${color.label}駒を選択中` : "← 駒の色を選んでください"}</div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>最終スコア</label>
        <StarRating value={player.finalScore} onChange={v => onChange({ ...player, finalScore: v })} color={accentColor} />
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <Toggle active={player.longestRoad} onClick={() => onChange({ ...player, longestRoad: !player.longestRoad })} label="🛤 最長道路" color="#2471a3" />
        <Toggle active={player.largestArmy} onClick={() => onChange({ ...player, largestArmy: !player.largestArmy })} label="⚔️ 最大騎士" color="#c0392b" />
      </div>

      <div>
        <label style={labelStyle}>戦略メモ</label>
        <textarea value={player.strategy} onChange={e => onChange({ ...player, strategy: e.target.value })} placeholder="今回の戦略・コメント..." rows={2}
          style={{ width: "100%", background: "#fdf6ec", border: "1px solid #c8906a", borderRadius: 6, color: "#5a2e10", padding: "6px 8px", fontFamily: "'Noto Serif JP', serif", fontSize: 12, resize: "vertical", outline: "none", boxSizing: "border-box" }} />
      </div>
    </div>
  );
}

function EditionPicker({ edition, scenario, onEditionChange, onScenarioChange }) {
  const current = EDITIONS.find(e => e.value === edition) || EDITIONS[0];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div>
        <label style={labelStyle}>版・エディション</label>
        <select value={edition} onChange={e => { onEditionChange(e.target.value); onScenarioChange(""); }} style={selectStyle}>
          {EDITIONS.map(ed => <option key={ed.value} value={ed.value}>{ed.label}</option>)}
        </select>
      </div>
      {current.scenarios.length > 0 && (
        <div style={{ paddingLeft: 14, borderLeft: "2px solid #c8906a" }}>
          <label style={labelStyle}>シナリオ</label>
          <select value={scenario} onChange={e => onScenarioChange(e.target.value)} style={selectStyle}>
            <option value="">── シナリオを選択（任意）──</option>
            {current.scenarios.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <span style={{ background: "#D62C1A18", border: "1px solid #D62C1A66", color: "#D62C1A", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontFamily: "'Cinzel', serif" }}>{current.label}</span>
        {scenario && <span style={{ background: "#8e2a0a18", border: "1px solid #8e2a0a66", color: "#8e2a0a", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontFamily: "'Cinzel', serif" }}>📜 {scenario}</span>}
      </div>
    </div>
  );
}

function ImageUploader({ label, image, onUpload, onClear }) {
  const ref = useRef();
  return (
    <div style={{ flex: 1 }}>
      <label style={{ ...labelStyle, marginBottom: 6 }}>{label}</label>
      {image ? (
        <div style={{ position: "relative" }}>
          <img src={image} alt={label} style={{ width: "100%", borderRadius: 8, border: "1px solid #c8906a", maxHeight: 160, objectFit: "cover" }} />
          <button onClick={onClear} style={{ position: "absolute", top: 4, right: 4, background: "#D62C1A", border: "none", borderRadius: "50%", width: 22, height: 22, color: "#fff", cursor: "pointer", fontSize: 12 }}>×</button>
        </div>
      ) : (
        <div onClick={() => ref.current.click()} style={{ border: "2px dashed #c8906a", borderRadius: 8, height: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#b07040", fontSize: 12, gap: 4, background: "#fdf6ec" }}>
          <span style={{ fontSize: 24 }}>📷</span>
          <span>タップして写真を追加</span>
        </div>
      )}
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => onUpload(ev.target.result); r.readAsDataURL(f); e.target.value = ""; }} />
    </div>
  );
}

// ===== Canvas utilities =====
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath(); }
function roundRectTop(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h); ctx.lineTo(x,y+h); ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath(); }
function roundRectBottom(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+w,y); ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y); ctx.closePath(); }
function drawDie(ctx, x, y, size, fill, dotColor, dots) { ctx.fillStyle=fill; ctx.strokeStyle=fill==="#F5C518"?"#C8980A":"#9e1a0a"; ctx.lineWidth=1; roundRect(ctx,x,y,size,size,5); ctx.fill(); ctx.stroke(); ctx.fillStyle=dotColor; dots.forEach(([dx,dy])=>{ ctx.beginPath(); ctx.arc(x+dx,y+dy,3,0,Math.PI*2); ctx.fill(); }); }

async function generateShareCard(record) {
  const CARD_W = 800;
  const sorted = [...record.players].sort((a, b) => b.finalScore - a.finalScore);
  const winner = sorted[0];
  const winnerC = getColor(winner.colorId) || FALLBACK_COLOR;
  const mapLabel = record.scenario ? `${record.edition} › ${record.scenario}` : (record.edition || "スタンダード");
  const hasImage = !!record.imageEnd;
  const CARD_H = hasImage ? 420 : 360;
  const LEFT_W = hasImage ? CARD_W * 0.55 : CARD_W;
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W; canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle="#fdf6ec"; roundRect(ctx,0,0,CARD_W,CARD_H,20); ctx.fill();
  ctx.fillStyle="#8e2a0a"; roundRectTop(ctx,0,0,CARD_W,64,20); ctx.fill();
  drawDie(ctx,18,18,26,"#F5C518","#1a1000",[[6,6],[20,20]]);
  drawDie(ctx,52,18,26,"#D62C1A","#ffffff",[[6,6],[20,6],[13,13],[6,20],[20,20]]);
  ctx.fillStyle="#fff"; ctx.font="bold 18px Georgia,serif"; ctx.fillText("CATAN SCORE",88,38);
  ctx.font="12px Georgia,serif"; ctx.fillStyle="#f5c89a"; ctx.fillText(`${record.date}　${record.location||""}`,88,56);

  const bY=80;
  ctx.fillStyle="#fff8f0"; roundRect(ctx,16,bY,LEFT_W-32,88,10); ctx.fill();
  ctx.strokeStyle="#e8b880"; ctx.lineWidth=1; ctx.stroke();
  ctx.font="28px serif"; ctx.fillText("👑",28,bY+44);
  const grd=ctx.createRadialGradient(72,bY+32,2,72,bY+32,20); grd.addColorStop(0,winnerC.light||winnerC.hex); grd.addColorStop(1,winnerC.hex);
  ctx.beginPath(); ctx.arc(72,bY+34,20,0,Math.PI*2); ctx.fillStyle=grd; ctx.fill();
  ctx.fillStyle="#3a1800"; ctx.font="bold 22px Georgia,serif"; ctx.fillText(winner.name,100,bY+30);
  ctx.font="13px Georgia,serif"; ctx.fillStyle="#8a5030";
  const sub=[]; if(winner.longestRoad)sub.push("🛤 最長道路"); if(winner.largestArmy)sub.push("⚔️ 最大騎士"); sub.push(mapLabel);
  ctx.fillText(sub.join("  ·  "),100,bY+50);
  ctx.fillStyle="#c0441a"; ctx.font="bold 38px Georgia,serif"; ctx.textAlign="right"; ctx.fillText(`${winner.finalScore}pt`,LEFT_W-28,bY+60); ctx.textAlign="left";

  const maxScore=Math.max(...sorted.map(p=>p.finalScore))||1;
  sorted.slice(1).forEach((p,i)=>{
    const y=bY+100+i*42; const c=getColor(p.colorId)||FALLBACK_COLOR;
    ctx.beginPath(); ctx.arc(28,y+12,8,0,Math.PI*2); ctx.fillStyle=c.hex; ctx.fill();
    ctx.fillStyle="#5a2e10"; ctx.font="14px Georgia,serif"; ctx.fillText(p.name,44,y+17);
    const bX=150,bW=LEFT_W-32-bX-60;
    ctx.fillStyle="#e8d0b4"; roundRect(ctx,bX,y+6,bW,10,5); ctx.fill();
    ctx.fillStyle=c.hex; roundRect(ctx,bX,y+6,Math.max(bW*(p.finalScore/maxScore),6),10,5); ctx.fill();
    ctx.fillStyle="#8a5030"; ctx.font="bold 14px Georgia,serif"; ctx.textAlign="right"; ctx.fillText(`${p.finalScore}pt`,LEFT_W-20,y+17); ctx.textAlign="left";
  });

  if (hasImage) {
    const iX=LEFT_W,iY=64,iW=CARD_W-LEFT_W,iH=CARD_H-64-44;
    await new Promise(resolve=>{
      const img=new Image();
      img.onload=()=>{
        ctx.save(); ctx.beginPath(); ctx.moveTo(iX,iY); ctx.lineTo(iX+iW-20,iY); ctx.quadraticCurveTo(iX+iW,iY,iX+iW,iY+20); ctx.lineTo(iX+iW,iY+iH); ctx.lineTo(iX,iY+iH); ctx.closePath(); ctx.clip();
        const sc=Math.max(iW/img.width,iH/img.height); ctx.drawImage(img,iX+(iW-img.width*sc)/2,iY+(iH-img.height*sc)/2,img.width*sc,img.height*sc);
        ctx.restore();
        ctx.fillStyle="rgba(0,0,0,0.22)"; ctx.fillRect(iX,iY+iH-28,iW,28);
        ctx.fillStyle="#fff"; ctx.font="12px Georgia,serif"; ctx.textAlign="center"; ctx.fillText("最終配置",iX+iW/2,iY+iH-10); ctx.textAlign="left";
        resolve();
      };
      img.onerror=resolve; img.src=record.imageEnd;
    });
    ctx.strokeStyle="#d4a880"; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(LEFT_W,64); ctx.lineTo(LEFT_W,CARD_H-44); ctx.stroke();
  }

  const fY=CARD_H-44;
  ctx.fillStyle="#fff8f0"; roundRectBottom(ctx,0,fY,CARD_W,44,20); ctx.fill();
  ctx.strokeStyle="#e8c8a0"; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(0,fY); ctx.lineTo(CARD_W,fY); ctx.stroke();
  let tx=16; ctx.font="12px Georgia,serif";
  [`⚓ ${mapLabel}`,`👥 ${record.players.length}人`,`🎯 ${record.victoryPoints||10}点`].forEach(tag=>{
    const tw=ctx.measureText(tag).width; ctx.fillStyle="#D62C1A18"; roundRect(ctx,tx,fY+10,tw+20,22,11); ctx.fill(); ctx.fillStyle="#D62C1A"; ctx.fillText(tag,tx+10,fY+25); tx+=tw+32;
  });
  ctx.fillStyle="#b07040"; ctx.font="11px Georgia,serif"; ctx.textAlign="right"; ctx.fillText("#カタン #ボードゲーム",CARD_W-16,fY+28); ctx.textAlign="left";
  return canvas.toDataURL("image/png");
}

function HistoryRow({ record, onDelete, onUpdate }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const winner = record.players.reduce((a, b) => b.finalScore > a.finalScore ? b : a, record.players[0]);
  const wc = getColor(winner.colorId) || FALLBACK_COLOR;
  const mapLabel = record.scenario ? `${record.edition} › ${record.scenario}` : (record.edition || "スタンダード");

  const handleShare = async (e) => {
    e.stopPropagation(); setSharing(true);
    try { const url = await generateShareCard(record); const a = document.createElement("a"); a.download = `catan-${record.date}.png`; a.href = url; a.click(); } catch(err) { console.error(err); }
    setSharing(false);
  };

  const startEdit = (e) => {
    e.stopPropagation();
    setEditData(JSON.parse(JSON.stringify(record))); // deep copy
    setEditing(true);
    setOpen(true);
  };

  const handleEditSave = async (e) => {
    e.stopPropagation();
    setSaving(true);
    try {
      await updateRecord(record.id, editData);
      onUpdate(record.id, editData);
      setEditing(false);
    } catch { alert("更新に失敗しました"); }
    setSaving(false);
  };

  const updateEditPlayer = (i, p) => {
    setEditData(prev => ({ ...prev, players: prev.players.map((x, j) => j === i ? p : x) }));
  };

  return (
    <div style={{ background: "#fff8f0", border: "1px solid #d4a880", borderRadius: 10, marginBottom: 8, overflow: "hidden" }}>
      <div onClick={() => !editing && setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: editing ? "default" : "pointer" }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: `radial-gradient(circle at 35% 35%, ${wc.light}, ${wc.hex})`, flexShrink: 0, boxShadow: `0 0 6px ${wc.hex}66` }} />
        <div style={{ flex: 1 }}>
          <div style={{ color: "#3a1800", fontSize: 13, fontFamily: "'Cinzel', serif", fontWeight: 700 }}>{winner.name} 優勝</div>
          <div style={{ color: "#8a5030", fontSize: 11 }}>{record.date} · {record.location} · {record.players.length}人</div>
          <div style={{ color: "#a06840", fontSize: 10, marginTop: 1 }}>{mapLabel} · 🎯{record.victoryPoints || 10}点</div>
        </div>
        {!editing && <span style={{ color: "#b07040", fontSize: 14 }}>{open ? "▲" : "▼"}</span>}
        <button onClick={handleShare} style={{ background: sharing ? "#e8d0b4" : "#D62C1A", border: "none", borderRadius: 6, color: "#fff", cursor: sharing ? "wait" : "pointer", fontSize: 12, padding: "4px 8px", fontFamily: "'Cinzel', serif", fontWeight: 700, flexShrink: 0 }}>{sharing ? "…" : "📤"}</button>
        {!editing
          ? <button onClick={startEdit} style={{ background: "none", border: "none", color: "#b07040", cursor: "pointer", fontSize: 14, padding: "2px 6px" }}>✏️</button>
          : <button onClick={e => { e.stopPropagation(); setEditing(false); }} style={{ background: "none", border: "none", color: "#b07040", cursor: "pointer", fontSize: 12, padding: "2px 6px" }}>✕</button>
        }
        <button onClick={e => { e.stopPropagation(); if (window.confirm(`「${winner.name} 優勝」の記録を削除しますか？`)) onDelete(record.id); }} style={{ background: "none", border: "none", color: "#b07040", cursor: "pointer", fontSize: 14, padding: "2px 6px" }}>🗑</button>
      </div>
      {open && !editing && (
        <div style={{ padding: "0 14px 14px", borderTop: "1px solid #e8c8a0" }}>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {[...record.players].sort((a, b) => b.finalScore - a.finalScore).map((p, i) => {
              const c = getColor(p.colorId) || FALLBACK_COLOR;
              return (
                <div key={i} style={{ background: "#fdf6ec", border: `1px solid ${c.hex}66`, borderRadius: 8, padding: "6px 10px", minWidth: 80 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <div style={{ width: 14, height: 14, borderRadius: "50%", background: c.hex, flexShrink: 0 }} />
                    <span style={{ color: c.hex, fontSize: 11, fontWeight: 700 }}>{p.name}</span>
                  </div>
                  <div style={{ color: "#5a2e10", fontSize: 12 }}>スコア: {p.finalScore}</div>
                  {p.longestRoad && <div style={{ color: "#2471a3", fontSize: 10 }}>🛤 最長道路</div>}
                  {p.largestArmy && <div style={{ color: "#c0392b", fontSize: 10 }}>⚔️ 最大騎士</div>}
                  {p.strategy && <div style={{ color: "#8a5030", fontSize: 10, marginTop: 2 }}>💬 {p.strategy}</div>}
                </div>
              );
            })}
          </div>
          {(record.imageStart || record.imageEnd) && (
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {record.imageStart && <img src={record.imageStart} alt="初期" style={{ flex: 1, borderRadius: 6, maxHeight: 100, objectFit: "cover" }} />}
              {record.imageEnd && <img src={record.imageEnd} alt="最終" style={{ flex: 1, borderRadius: 6, maxHeight: 100, objectFit: "cover" }} />}
            </div>
          )}
        </div>
      )}
      {editing && editData && (
        <div style={{ padding: "12px 14px 14px", borderTop: "1px solid #e8c8a0" }}>
          <div style={{ color: "#8e2a0a", fontFamily: "'Cinzel', serif", fontSize: 11, fontWeight: 700, marginBottom: 10, letterSpacing: 1 }}>✏️ EDIT RECORD</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            <div><label style={labelStyle}>対戦日</label><input type="date" value={editData.date} onChange={e => setEditData(p => ({...p, date: e.target.value}))} style={selectStyle} /></div>
            <div><label style={labelStyle}>場所</label><input type="text" value={editData.location || ""} onChange={e => setEditData(p => ({...p, location: e.target.value}))} style={selectStyle} /></div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {editData.players.map((p, i) => {
              const c = getColor(p.colorId) || FALLBACK_COLOR;
              return (
                <div key={i} style={{ background: "#fdf6ec", border: `1px solid ${c.hex}66`, borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: c.hex, flexShrink: 0 }} />
                    <span style={{ color: "#5a2e10", fontSize: 12, fontWeight: 700 }}>{p.name}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <label style={{ ...labelStyle, margin: 0, whiteSpace: "nowrap" }}>スコア</label>
                    <input type="number" min={0} max={15} value={p.finalScore} onChange={e => updateEditPlayer(i, {...p, finalScore: Number(e.target.value)})}
                      style={{ ...selectStyle, width: 60, padding: "4px 6px" }} />
                    <button onClick={() => updateEditPlayer(i, {...p, longestRoad: !p.longestRoad})}
                      style={{ fontSize: 10, padding: "3px 8px", borderRadius: 5, border: `1px solid ${p.longestRoad ? "#2471a3" : "#c8906a"}`, background: p.longestRoad ? "#2471a322" : "#fdf6ec", color: p.longestRoad ? "#2471a3" : "#8a5030", cursor: "pointer" }}>🛤 最長道路</button>
                    <button onClick={() => updateEditPlayer(i, {...p, largestArmy: !p.largestArmy})}
                      style={{ fontSize: 10, padding: "3px 8px", borderRadius: 5, border: `1px solid ${p.largestArmy ? "#c0392b" : "#c8906a"}`, background: p.largestArmy ? "#c0392b22" : "#fdf6ec", color: p.largestArmy ? "#c0392b" : "#8a5030", cursor: "pointer" }}>⚔️ 最大騎士</button>
                  </div>
                  <textarea value={p.strategy || ""} onChange={e => updateEditPlayer(i, {...p, strategy: e.target.value})} placeholder="戦略メモ..." rows={1}
                    style={{ width: "100%", marginTop: 6, background: "#fff8f0", border: "1px solid #c8906a", borderRadius: 4, color: "#5a2e10", padding: "4px 6px", fontFamily: "'Noto Serif JP', serif", fontSize: 11, resize: "vertical", outline: "none", boxSizing: "border-box" }} />
                </div>
              );
            })}
          </div>
          <button onClick={handleEditSave} disabled={saving} style={{ width: "100%", padding: "10px 0", borderRadius: 8, background: saving ? "#e8d0b4" : "linear-gradient(135deg,#2471a3,#3498db)", border: "none", cursor: saving ? "wait" : "pointer", color: "#fff", fontFamily: "'Cinzel', serif", fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
            {saving ? "⏳ 保存中..." : "💾 変更を保存"}
          </button>
        </div>
      )}
    </div>
  );
}

function StatsView({ history }) {
  const stats = {};
  history.forEach(r => {
    r.players.forEach(p => {
      if (!stats[p.name]) stats[p.name] = { wins: 0, games: 0, scores: [], colorId: p.colorId || null };
      stats[p.name].games++;
      stats[p.name].scores.push(p.finalScore);
      const w = r.players.reduce((a, b) => b.finalScore > a.finalScore ? b : a, r.players[0]);
      if (w.name === p.name) stats[p.name].wins++;
    });
  });
  const entries = Object.entries(stats).sort((a, b) => b[1].wins - a[1].wins);
  if (!entries.length) return <div style={{ textAlign: "center", color: "#8a5030", padding: 40, fontFamily: "'Cinzel', serif" }}>対戦記録がありません</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {entries.map(([name, s]) => {
        const c = getColor(s.colorId) || FALLBACK_COLOR;
        const avg = s.scores.length ? (s.scores.reduce((a, b) => a + b, 0) / s.scores.length).toFixed(1) : 0;
        const rate = s.games ? Math.round(s.wins / s.games * 100) : 0;
        return (
          <div key={name} style={{ background: "#fff8f0", border: `1px solid ${c.hex}66`, borderRadius: 10, padding: "12px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: `radial-gradient(circle at 35% 35%, ${c.light}, ${c.hex})`, boxShadow: `0 0 8px ${c.hex}44` }} />
              <span style={{ color: "#3a1800", fontFamily: "'Cinzel', serif", fontSize: 15, fontWeight: 700 }}>{name}</span>
              <span style={{ color: c.hex, fontSize: 10, marginLeft: "auto", fontFamily: "'Cinzel', serif", fontWeight: 700 }}>{c.label}駒</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
              {[{ label: "試合数", value: s.games }, { label: "優勝", value: `${s.wins}回` }, { label: "勝率", value: `${rate}%` }, { label: "平均スコア", value: avg }, { label: "累計総得点", value: s.scores.reduce((a,b)=>a+b,0) }].map(({ label, value }) => (
                <div key={label} style={{ background: "#fdf6ec", borderRadius: 6, padding: "6px 8px", textAlign: "center", border: "1px solid #e8c8a0" }}>
                  <div style={{ color: "#8a5030", fontSize: 9, fontFamily: "'Cinzel', serif", letterSpacing: 1 }}>{label}</div>
                  <div style={{ color: c.hex, fontSize: 15, fontWeight: 700, fontFamily: "'Cinzel', serif" }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ color: "#8a5030", fontSize: 9, fontFamily: "'Cinzel', serif", marginBottom: 3 }}>WINNING RATE</div>
            <div style={{ background: "#e8d0b4", borderRadius: 4, height: 6, overflow: "hidden" }}>
              <div style={{ width: `${rate}%`, height: "100%", background: c.hex, borderRadius: 4, transition: "width .5s" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MemberManager({ members, onUpdate }) {
  const [newName, setNewName] = useState("");
  const add = () => { const n = newName.trim(); if (!n || members.includes(n)) return; onUpdate([...members, n]); setNewName(""); };
  return (
    <div style={{ marginTop: 16, padding: "14px 16px", background: "#fdf6ec", border: "1px solid #d4a880", borderRadius: 10 }}>
      <div style={{ color: "#8e2a0a", fontFamily: "'Cinzel', serif", fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 10 }}>👥 MEMBER LIST</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} placeholder="名前を追加..." style={{ ...selectStyle, flex: 1 }} />
        <button onClick={add} style={{ padding: "6px 14px", borderRadius: 6, background: "#D62C1A", border: "none", color: "#fff", cursor: "pointer", fontFamily: "'Cinzel', serif", fontSize: 12, fontWeight: 700 }}>追加</button>
      </div>
      {members.length === 0
        ? <div style={{ color: "#b07040", fontSize: 11, fontFamily: "'Cinzel', serif", textAlign: "center", padding: "8px 0" }}>まだメンバーがいません</div>
        : <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {members.map(name => (
              <div key={name} style={{ display: "flex", alignItems: "center", gap: 4, background: "#fff8f0", border: "1px solid #c8906a", borderRadius: 20, padding: "4px 10px" }}>
                <span style={{ color: "#5a2e10", fontSize: 12, fontFamily: "'Noto Serif JP', serif" }}>{name}</span>
                <button onClick={() => onUpdate(members.filter(m => m !== name))} style={{ background: "none", border: "none", color: "#b07040", cursor: "pointer", fontSize: 11, lineHeight: 1, padding: "0 2px" }}>×</button>
              </div>
            ))}
          </div>
      }
    </div>
  );
}

// ===== メインアプリ =====
export default function CatanApp() {
  // セッションから合言葉を復元
  const savedRoom = sessionStorage.getItem("catan_room");
  const [roomCode, setRoomCode] = useState(savedRoom || null);
  const [tab, setTab] = useState("new");
  const [playerCount, setPlayerCount] = useState(4);
  const [players, setPlayers] = useState(() => Array.from({ length: 4 }, (_, i) => defaultPlayer(i)));
  const [edition, setEdition] = useState("スタンダード");
  const [scenario, setScenario] = useState("");
  const [victoryPoints, setVictoryPoints] = useState(10);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState("");
  const [imageStart, setImageStart] = useState(null);
  const [imageEnd, setImageEnd] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [members, setMembers] = useState([]);
  const [showMemberManager, setShowMemberManager] = useState(false);

  // ログイン後に履歴・メンバーを読み込む
  useEffect(() => {
    if (!roomCode) return;
    setMembers(loadMembers(roomCode));
    setLoadingHistory(true);
    fetchHistory(roomCode)
      .then(h => setHistory(h))
      .catch(e => console.error(e))
      .finally(() => setLoadingHistory(false));
  }, [roomCode]);

  const handleLogin = (code) => setRoomCode(code);

  const handleLogout = () => {
    sessionStorage.removeItem("catan_room");
    setRoomCode(null);
    setHistory([]);
  };

  const updateMembers = (m) => { setMembers(m); saveMembers(roomCode, m); };
  const handleAddMember = (name) => { if (!members.includes(name)) { const m = [...members, name]; setMembers(m); saveMembers(roomCode, m); } };
  const updatePlayerCount = (n) => { setPlayerCount(n); setPlayers(prev => n > prev.length ? [...prev, ...Array.from({ length: n - prev.length }, (_, i) => defaultPlayer(prev.length + i))] : prev.slice(0, n)); };
  const updatePlayer = (i, p) => setPlayers(prev => prev.map((x, j) => j === i ? p : x));
  const usedColorsFor = (idx) => players.filter((_, i) => i !== idx).map(p => p.colorId);
  const winner = players.reduce((a, b) => b.finalScore > a.finalScore ? b : a, players[0]);

  const resetForm = () => {
    setEdition("スタンダード");
    setScenario("");
    setVictoryPoints(10);
    setDate(new Date().toISOString().slice(0, 10));
    setLocation("");
    setImageStart(null);
    setImageEnd(null);
    setPlayerCount(4);
    setPlayers(Array.from({ length: 4 }, (_, i) => defaultPlayer(i)));
  };

  const handleSave = async () => {
    setSaveError("");
    const record = { id: genId(), date, location, edition, scenario, victoryPoints, players, imageStart, imageEnd };
    try {
      await insertRecord(roomCode, record);
      const h = [record, ...history];
      setHistory(h);
      setSaved(true);
      setTimeout(() => { setSaved(false); resetForm(); }, 1500);
    } catch (e) {
      setSaveError("保存に失敗しました。接続を確認してください。");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteRecord(id);
      setHistory(h => h.filter(r => r.id !== id));
    } catch (e) {
      alert("削除に失敗しました");
    }
  };

  const handleUpdate = (id, updatedRecord) => {
    setHistory(h => h.map(r => r.id === id ? { ...updatedRecord, id } : r));
  };

  const filteredHistory = history.filter(r =>
    r.players.some(p => p.name.includes(searchQuery)) || (r.location||"").includes(searchQuery) ||
    (r.date||"").includes(searchQuery) || (r.edition||"").includes(searchQuery) || (r.scenario||"").includes(searchQuery)
  );

  // ログインしていなければログイン画面を表示
  if (!roomCode) return <RoomLogin onLogin={handleLogin} />;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(175deg, #f5ede0 0%, #eedcc8 40%, #e8d0b4 100%)", fontFamily: "'Noto Serif JP', serif", paddingBottom: 40 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Noto+Serif+JP:wght@400;600;700&display=swap');*{box-sizing:border-box}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#e8d0b4}::-webkit-scrollbar-thumb{background:#b07040;border-radius:2px}input,select,textarea{font-family:inherit}button:active{transform:scale(0.97)}select option{background:#fdf6ec;color:#5a3010}`}</style>

      <div style={{ background: "linear-gradient(180deg,#c0441a 0%,#a83510 60%,#8e2a0a 100%)", borderBottom: "3px solid #7a2208", padding: "22px 16px 16px", textAlign: "center", position: "relative", boxShadow: "0 4px 16px rgba(140,50,10,0.25)" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "linear-gradient(90deg,#1565C0,#C5CDD2,#E65100,#B71C1C,#1B5E20,#4E342E)" }} />

        {/* ルームコード表示＋ログアウト */}
        <div style={{ position: "absolute", top: 10, right: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ background: "#ffffff22", borderRadius: 20, padding: "3px 10px", fontSize: 10, color: "#f5c89a", fontFamily: "'Cinzel', serif", letterSpacing: 1 }}>🔑 {roomCode}</span>
          <button onClick={handleLogout} style={{ background: "none", border: "1px solid #f5c89a55", borderRadius: 6, color: "#f5c89a99", fontSize: 9, padding: "3px 7px", cursor: "pointer", fontFamily: "'Cinzel', serif" }}>退室</button>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 10 }}>
          <svg width="42" height="42" viewBox="0 0 42 42" style={{ filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.35))" }}>
            <rect x="2" y="2" width="38" height="38" rx="7" fill="#F5C518" stroke="#C8980A" strokeWidth="1.5"/>
            {[[12,12],[30,30]].map(([cx,cy],i) => <circle key={i} cx={cx} cy={cy} r="4.5" fill="#1a1000"/>)}
          </svg>
          <svg width="42" height="42" viewBox="0 0 42 42" style={{ filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.35))" }}>
            <rect x="2" y="2" width="38" height="38" rx="7" fill="#D62C1A" stroke="#9e1a0a" strokeWidth="1.5"/>
            {[[11,11],[31,11],[21,21],[11,31],[31,31]].map(([cx,cy],i) => <circle key={i} cx={cx} cy={cy} r="4" fill="#fff"/>)}
          </svg>
        </div>
        <h1 style={{ margin: 0, fontFamily: "'Cinzel',serif", fontWeight: 900, fontSize: 22, letterSpacing: 3, color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,0.4)" }}>CATAN SCORE</h1>
        <p style={{ margin: "4px 0 0", color: "#f5c89a", fontSize: 11, letterSpacing: 2, fontFamily: "'Cinzel',serif" }}>BATTLE RECORD</p>
      </div>

      <div style={{ display: "flex", background: "#8e2a0a", borderBottom: "2px solid #6e1e04" }}>
        {[{ key: "new", label: "⚔️ 新規対戦" }, { key: "history", label: "📜 履歴" }, { key: "stats", label: "📊 統計" }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ flex: 1, padding: "12px 0", background: "none", border: "none", cursor: "pointer", color: tab === t.key ? "#F5C518" : "#f5c89a99", fontFamily: "'Cinzel',serif", fontSize: 11, fontWeight: 700, letterSpacing: 1, borderBottom: tab === t.key ? "2px solid #F5C518" : "2px solid transparent", transition: "all .2s" }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding: "16px 14px", maxWidth: 540, margin: "0 auto" }}>

        {tab === "new" && (
          <div>
            <div style={{ background: "#fff8f0", border: "1px solid #d4a880", borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
              <div style={{ color: "#8e2a0a", fontFamily: "'Cinzel',serif", fontSize: 12, fontWeight: 700, marginBottom: 14, letterSpacing: 2 }}>📋 GAME INFO</div>
              <div style={{ marginBottom: 14 }}><EditionPicker edition={edition} scenario={scenario} onEditionChange={setEdition} onScenarioChange={setScenario} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div><label style={labelStyle}>対戦日</label><input type="date" value={date} onChange={e => setDate(e.target.value)} style={selectStyle} /></div>
                <div><label style={labelStyle}>場所</label><input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="例: リビング" style={selectStyle} /></div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>勝利点（共通目標）</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {[5,6,7,8,9,10,11,12,13,14].map(n => <button key={n} onClick={() => setVictoryPoints(n)} style={{ flex: 1, height: 34, borderRadius: 6, cursor: "pointer", background: victoryPoints===n?"#D62C1A":"#fdf6ec", border: `1px solid ${victoryPoints===n?"#D62C1A":"#c8906a"}`, color: victoryPoints===n?"#fff":"#8a5030", fontFamily: "'Cinzel',serif", fontSize: 12, fontWeight: 700, transition: "all .2s" }}>{n}</button>)}
                </div>
                <div style={{ color: "#b07040", fontSize: 10, marginTop: 4, fontFamily: "'Cinzel',serif" }}>※ 航海者版は12〜14点、スタンダードは10点が目安</div>
              </div>
              <div>
                <label style={labelStyle}>プレイヤー人数</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {[2,3,4,5,6].map(n => <button key={n} onClick={() => updatePlayerCount(n)} style={{ flex: 1, height: 34, borderRadius: 6, cursor: "pointer", background: playerCount===n?"#8e2a0a":"#fdf6ec", border: `1px solid ${playerCount===n?"#8e2a0a":"#c8906a"}`, color: playerCount===n?"#fff":"#8a5030", fontFamily: "'Cinzel',serif", fontSize: 13, fontWeight: 700, transition: "all .2s" }}>{n}</button>)}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <button onClick={() => setShowMemberManager(v => !v)} style={{ width: "100%", padding: "9px 0", borderRadius: 8, background: showMemberManager?"#8e2a0a11":"#fdf6ec", border: `1px solid ${showMemberManager?"#8e2a0a88":"#c8906a"}`, color: showMemberManager?"#8e2a0a":"#8a5030", fontFamily: "'Cinzel',serif", fontSize: 11, cursor: "pointer", letterSpacing: 1, transition: "all .2s" }}>
                👥 メンバーリストを{showMemberManager ? "閉じる" : "管理する"}
              </button>
              {showMemberManager && <MemberManager members={members} onUpdate={updateMembers} />}
            </div>

            <div style={{ background: "#fff8f0", border: "1px solid #d4a880", borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
              <div style={{ color: "#8e2a0a", fontFamily: "'Cinzel',serif", fontSize: 12, fontWeight: 700, marginBottom: 12, letterSpacing: 2 }}>📷 MAP PHOTOS</div>
              <div style={{ display: "flex", gap: 10 }}>
                <ImageUploader label="🏁 初期配置" image={imageStart} onUpload={setImageStart} onClear={() => setImageStart(null)} />
                <ImageUploader label="🏆 最終形" image={imageEnd} onUpload={setImageEnd} onClear={() => setImageEnd(null)} />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 14 }}>
              {players.map((p, i) => <PlayerCard key={i} player={p} onChange={np => updatePlayer(i, np)} winner={p === winner && players.some(x => x.finalScore > 0)} usedColors={usedColorsFor(i)} knownMembers={members} onAddMember={handleAddMember} />)}
            </div>

            {saveError && <div style={{ color: "#D62C1A", fontSize: 12, textAlign: "center", marginBottom: 8 }}>⚠️ {saveError}</div>}

            <button onClick={handleSave} style={{ width: "100%", padding: "14px 0", borderRadius: 10, background: saved?"linear-gradient(135deg,#27ae60,#2ecc71)":"linear-gradient(135deg,#c0392b,#e74c3c)", border: "none", cursor: "pointer", color: "#fff", fontFamily: "'Cinzel',serif", fontSize: 15, fontWeight: 700, letterSpacing: 2, boxShadow: saved?"0 4px 15px #27ae6055":"0 4px 15px #c0392b55", transition: "all .3s" }}>
              {saved ? "✓ 保存しました！" : "⚔️ 対戦結果を保存"}
            </button>
          </div>
        )}

        {tab === "history" && (
          <div>
            <input type="text" placeholder="🔍 名前・場所・日付・版で検索..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ ...selectStyle, marginBottom: 14, padding: "10px 12px", fontSize: 13 }} />
            {loadingHistory
              ? <div style={{ textAlign: "center", color: "#8a5030", padding: 40, fontFamily: "'Cinzel',serif" }}>⏳ 読み込み中...</div>
              : filteredHistory.length === 0
                ? <div style={{ textAlign: "center", color: "#8a5030", padding: 40, fontFamily: "'Cinzel',serif" }}>{history.length === 0 ? "まだ対戦記録がありません" : "検索結果がありません"}</div>
                : filteredHistory.map(r => <HistoryRow key={r.id} record={r} onDelete={handleDelete} onUpdate={handleUpdate} />)
            }
          </div>
        )}

        {tab === "stats" && (
          <div>
            <div style={{ color: "#8e2a0a", fontFamily: "'Cinzel',serif", fontSize: 12, fontWeight: 700, letterSpacing: 2, marginBottom: 14, textAlign: "center" }}>📊 PLAYER STATISTICS</div>
            <StatsView history={history} />
          </div>
        )}
      </div>

      <div style={{ padding: "8px 14px 0", maxWidth: 540, margin: "0 auto" }}>
        <div style={{ background: "#fff8f0", border: "1px solid #d4a880", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#3a1800" style={{ flexShrink: 0 }}>
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#3a1800", fontSize: 13, fontFamily: "'Cinzel',serif", fontWeight: 700, marginBottom: 2 }}>感想・要望をポストしてね！</div>
            <div style={{ color: "#8a5030", fontSize: 11, fontFamily: "'Noto Serif JP',serif", lineHeight: 1.5 }}>#CATANスコア をつけて投稿してくれると励みになります🎲</div>
          </div>
          <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent("カタンのスコア管理アプリ使ってみた！\n感想・要望をぜひ教えてね🎲\n#CATANスコア #カタン #ボードゲーム\nhttps://catan-score.vercel.app")}`} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", background: "#3a1800", color: "#fff", fontFamily: "'Cinzel',serif", fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 20, textDecoration: "none", flexShrink: 0 }}>ポストする</a>
        </div>
        <div style={{ textAlign: "center", color: "#c8906a", fontSize: 10, fontFamily: "'Cinzel',serif", marginTop: 10, marginBottom: 20, letterSpacing: 1 }}>CATAN SCORE · Made with ♥</div>
      </div>
    </div>
  );
}
