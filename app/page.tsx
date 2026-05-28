
"use client";import { useEffect, useState } from "react";
import { ID, Query, type Models } from "appwrite";
import { databases } from "../lib/appwrite";type EventType = {
  $id: string;
  title: string;
  time: string;
  place?: string;
  road?: string;
  team: "first" | "second";
  day_id: string;
};type DayType = {
  $id: string;
  date: string;
  firstTeamName: string;
  secondTeamName: string;
  boards: {
    first: EventType[];
    second: EventType[];
  };
};type EventDocument = Models.Document & Omit<EventType, "$id">;type DayDocument = Models.Document & {
  date: string;
  first_team_name?: string;
  second_team_name?: string;
};const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "main";
const DAYS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_DAYS_COLLECTION_ID ?? "days";
const EVENTS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_EVENTS_COLLECTION_ID ?? "events";const inputStyle = {
  width: "100%",
  minWidth: 0,
  background: "transparent",
  border: "none",
  color: "white",
  fontWeight: 800,
  outline: "none",
};export default function Page() {
  const [days, setDays] = useState<DayType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);  const [dragged, setDragged] = useState<{ event: EventType; dayId: string } | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventType | null>(null);  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<"date" | "firstTeamName" | "secondTeamName" | null>(null);
  const [editValue, setEditValue] = useState("");  const [editForm, setEditForm] = useState({ title: "", time: "", place: "", road: "" });  async function loadData() {
    setLoading(true);
    try {
      const daysRes = await databases.listDocuments<DayDocument>(DATABASE_ID, DAYS_COLLECTION_ID, [
        Query.orderAsc("date"),
      ]);
      const eventsRes = await databases.listDocuments<EventDocument>(DATABASE_ID, EVENTS_COLLECTION_ID);
      const events = eventsRes.documents.map((event) => ({
        $id: event.$id,
        title: event.title,
        time: event.time,
        place: event.place,
        road: event.road,
        team: event.team,
        day_id: event.day_id,
      }));  const formatted: DayType[] = daysRes.documents.map((day) => ({
    $id: day.$id,
    date: day.date,
    firstTeamName: day.first_team_name || "Я Воробушки",
    secondTeamName: day.second_team_name || "Лев и новенькие",
    boards: {
      first: events.filter((event) => event.day_id === day.$id && event.team === "first"),
      second: events.filter((event) => event.day_id === day.$id && event.team === "second"),
    },
  }));  setDays(formatted);
  setLoadError("");
} catch (err) {
  console.error(err);
  const message = err instanceof Error ? err.message : "Неизвестная ошибка";
  setLoadError(Не получилось загрузить даты из базы: ${message});
} finally {
  setLoading(false);
}  }  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);return () => window.clearTimeout(timer);  }, []);  async function addDay() {
    const value = prompt("Введите дату:");
    if (!value) return;const day = await databases.createDocument<DayDocument>(DATABASE_ID, DAYS_COLLECTION_ID, ID.unique(), {
  date: value,
  first_team_name: "Я Воробушки",
  second_team_name: "Лев и новенькие",
});await loadData();
setSelectedDayId(day.$id);  }  function startDayEdit(dayId: string, field: "date" | "firstTeamName" | "secondTeamName", currentValue: string) {
    setEditingDayId(dayId);
    setEditingField(field);
    setEditValue(currentValue);
  }  async function saveDayEdit() {
    if (!editingDayId || !editingField) return;const updateData: Partial<Pick<DayDocument, "date" | "first_team_name" | "second_team_name">> = {};
if (editingField === "date") updateData.date = editValue;
if (editingField === "firstTeamName") updateData.first_team_name = editValue;
if (editingField === "secondTeamName") updateData.second_team_name = editValue;await databases.updateDocument(DATABASE_ID, DAYS_COLLECTION_ID, editingDayId, updateData);setEditingDayId(null);
setEditingField(null);
await loadData();  }  async function addEvent(dayId: string, team: "first" | "second") {
    await databases.createDocument(DATABASE_ID, EVENTS_COLLECTION_ID, ID.unique(), {
      title: "Новое выступление",
      time: "18:00",
      place: "",
      road: "",
      team,
      day_id: dayId,
    });
    await loadData();
  }  async function deleteEvent(id: string) {
    await databases.deleteDocument(DATABASE_ID, EVENTS_COLLECTION_ID, id);
    await loadData();
  }  function startEdit(event: EventType) {
    setEditingEvent(event);
    setEditForm({
      title: event.title,
      time: event.time,
      place: event.place || "",
      road: event.road || "",
    });
  }  async function saveEdit() {
    if (!editingEvent) return;
    await databases.updateDocument(DATABASE_ID, EVENTS_COLLECTION_ID, editingEvent.$id, {
      title: editForm.title,
      time: editForm.time,
      place: editForm.place,
      road: editForm.road,
    });
    setEditingEvent(null);
    await loadData();
  }  async function quickRoad(event: EventType) {
    const value = prompt("Время в пути:");
    if (!value) return;
    await databases.updateDocument(DATABASE_ID, EVENTS_COLLECTION_ID, event.$id, { road: value });
    await loadData();
  }  async function onDrop(dayId: string, team: "first" | "second") {
    if (!dragged) return;
    await databases.updateDocument(DATABASE_ID, EVENTS_COLLECTION_ID, dragged.event.$id, { day_id: dayId, team });
    setDragged(null);
    await loadData();
  }  function renderEvent(event: EventType, dayId: string) {
    return (
      <div key={event.$id} style={{ marginBottom: 16 }}>
        <div
          draggable
          onDragStart={() => setDragged({ event, dayId })}
          onClick={() => startEdit(event)}
          style={{ padding: "18px 20px", border: "1px solid #e0e7ff", borderRadius: 16, background: "#fff", boxShadow: "0 4px 15px rgba(0,0,0,0.06)", cursor: "grab" }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>{event.time}</div>
              <div style={{ fontSize: 18, fontWeight: 600, overflowWrap: "anywhere" }}>{event.title}</div>
              {event.place && <div style={{ fontSize: 15, color: "#475569", marginTop: 8 }}> {event.place}</div>}
            </div>        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={(e) => { e.stopPropagation(); quickRoad(event); }} style={{ fontSize: 22 }}></button>
          <button onClick={(e) => { e.stopPropagation(); deleteEvent(event.$id); }} style={{ fontSize: 22 }}></button>
        </div>
      </div>
    </div>{event.road && <div style={{ marginLeft: 24, marginTop: 8, color: "#f59e0b", fontWeight: 600 }}>→ {event.road}</div>}  </div>
);  }  function renderColumn(day: DayType, team: "first" | "second") {
    const items = day.boards[team];
    const teamName = team === "first" ? day.firstTeamName : day.secondTeamName;
    const teamField = team === "first" ? "firstTeamName" : "secondTeamName";return (
  <div
    onDragOver={(e) => e.preventDefault()}
    onDrop={() => onDrop(day.$id, team)}
    style={{ minWidth: 0, background: "#fff", borderRadius: 20, padding: 18, border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(0,0,0,0.06)" }}  >
<div onClick={() => startDayEdit(day.$id, teamField, teamName)} style={{ fontSize: "clamp(18px, 5vw, 22px)", fontWeight: 700, padding: "12px 18px", background: "#1e2937", color: "white", borderRadius: 14, marginBottom: 24, cursor: "pointer", overflowWrap: "anywhere" }}>
  {editingDayId === day.$id && editingField === teamField ? (
    <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={saveDayEdit} onKeyDown={(e) => e.key === "Enter" && saveDayEdit()} autoFocus style={{ ...inputStyle, fontSize: "clamp(18px, 5vw, 22px)" }} />
  ) : (
    teamName
  )}
</div><button onClick={() => addEvent(day.$id, team)} style={{ float: "right", fontSize: 24 }}></button><div style={{ clear: "both" }}>
  {items.map((event) => renderEvent(event, day.$id))}
</div>  </div>
);  }  function renderStartPage() {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui, Arial, sans-serif", padding: "32px 16px" }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "#1e2937", textAlign: "center", marginBottom: 34 }}> Dance Ops</h1>      {loadError && (
        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 16, color: "#9a3412", fontSize: 16, fontWeight: 600, lineHeight: 1.5, marginBottom: 18, padding: 16, textAlign: "center" }}>
          {loadError}
        </div>
      )}

  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 16 }}>
    {days.map((day) => (
      <button
        key={day.$id}
        onClick={() => setSelectedDayId(day.$id)}
        style={{ minHeight: 130, padding: 18, border: "1px solid #e2e8f0", borderRadius: 18, background: "#ffffff", color: "#1e2937", boxShadow: "0 10px 30px rgba(0,0,0,0.06)", fontSize: 24, fontWeight: 800, cursor: "pointer", textAlign: "center", overflowWrap: "anywhere" }}
      >
        {day.date}
      </button>
    ))}

<button
  onClick={addDay}
  style={{ minHeight: 130, padding: 18, border: "2px dashed #94a3b8", borderRadius: 18, background: "#ffffff", color: "#475569", boxShadow: "0 10px 30px rgba(0,0,0,0.04)", fontSize: 46, fontWeight: 500, cursor: "pointer" }}
  aria-label="Добавить дату"
>
  +
</button>  </div>
</div>  </div>
);  }  if (loading) return <div style={{ padding: 50, textAlign: "center", fontSize: 18 }}>Загрузка...</div>;  const selectedDay = days.find((day) => day.$id === selectedDayId);  if (!selectedDay) return renderStartPage();  return (
    <div style={{ padding: "20px 12px", background: "#f8fafc", minHeight: "100vh", overflowX: "hidden", fontFamily: "system-ui, Arial, sans-serif" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 32 }}>
          <button onClick={() => setSelectedDayId(null)} style={{ padding: "12px 18px", background: "#ffffff", color: "#1e2937", border: "1px solid #e2e8f0", borderRadius: 14, fontSize: 18, fontWeight: 700, cursor: "pointer" }}>
            ← Даты
          </button>      <h1 style={{ fontSize: "clamp(26px, 8vw, 32px)", fontWeight: 800, color: "#1e2937", textAlign: "center", margin: 0 }}> Dance Ops</h1>

  <div style={{ width: 94 }} />
</div>

<div style={{ marginBottom: 60 }}>
  <div onClick={() => startDayEdit(selectedDay.$id, "date", selectedDay.date)} style={{ display: "inline-block", maxWidth: "100%", boxSizing: "border-box", background: "#1e2937", color: "white", borderRadius: 18, padding: "14px 24px", fontSize: "clamp(24px, 8vw, 32px)", fontWeight: 800, marginBottom: 24, cursor: "pointer" }}>
    {editingDayId === selectedDay.$id && editingField === "date" ? (
      <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={saveDayEdit} onKeyDown={(e) => e.key === "Enter" && saveDayEdit()} autoFocus style={{ ...inputStyle, fontSize: "clamp(24px, 8vw, 32px)" }} />
    ) : (
      selectedDay.date
    )}
  </div>

  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap: 24 }}>
    {renderColumn(selectedDay, "first")}
    {renderColumn(selectedDay, "second")}
  </div>
</div>  </div>

  {editingEvent && (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div style={{ background: "white", padding: 28, borderRadius: 20, width: "100%", maxWidth: 420 }}>
        <h3 style={{ marginBottom: 20 }}>Редактировать выступление</h3>    <input value={editForm.title} placeholder="Название" onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} style={{ width: "100%", padding: 14, marginBottom: 12, borderRadius: 12, border: "1px solid #ddd", fontSize: 16 }} />
    <input value={editForm.time} placeholder="Время" onChange={(e) => setEditForm({ ...editForm, time: e.target.value })} style={{ width: "100%", padding: 14, marginBottom: 12, borderRadius: 12, border: "1px solid #ddd", fontSize: 16 }} />
    <input value={editForm.place} placeholder="Место" onChange={(e) => setEditForm({ ...editForm, place: e.target.value })} style={{ width: "100%", padding: 14, marginBottom: 12, borderRadius: 12, border: "1px solid #ddd", fontSize: 16 }} />
    <input value={editForm.road} placeholder="Время в пути" onChange={(e) => setEditForm({ ...editForm, road: e.target.value })} style={{ width: "100%", padding: 14, marginBottom: 24, borderRadius: 12, border: "1px solid #ddd", fontSize: 16 }} /><div style={{ display: "flex", gap: 12 }}>
  <button onClick={saveEdit} style={{ flex: 1, padding: 16, background: "#4f46e5", color: "white", border: "none", borderRadius: 12, fontWeight: 600 }}>Сохранить</button>
  <button onClick={() => setEditingEvent(null)} style={{ flex: 1, padding: 16, background: "#e2e8f0", border: "none", borderRadius: 12 }}>Отмена</button>
</div>  </div>
</div>  )}</div>  );
}
