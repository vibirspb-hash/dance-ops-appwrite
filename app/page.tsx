"use client";

import { useEffect, useState } from "react";
import { ID, Query, type Models } from "appwrite";
import { databases } from "../lib/appwrite";

type EventType = {
  $id: string;
  title: string;
  time: string;
  place?: string;
  road?: string;
  team: "first" | "second";
  day_id: string;
};

type DayType = {
  $id: string;
  date: string;
  firstTeamName: string;
  secondTeamName: string;
  boards: {
    first: EventType[];
    second: EventType[];
  };
};

type EventDocument = Models.Document & Omit<EventType, "$id">;
type DayDocument = Models.Document & {
  date: string;
  first_team_name?: string;
  second_team_name?: string;
};

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "main";
const DAYS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_DAYS_COLLECTION_ID ?? "days";
const EVENTS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_EVENTS_COLLECTION_ID ?? "events";

export default function Page() {
  const [days, setDays] = useState<DayType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  const [dragged, setDragged] = useState<{ event: EventType; dayId: string } | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventType | null>(null);

  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<"date" | "firstTeamName" | "secondTeamName" | null>(null);
  const [editValue, setEditValue] = useState("");

  const [editForm, setEditForm] = useState({ title: "", time: "", place: "", road: "" });

  async function loadData() {
    setLoading(true);
    try {
      const [daysRes, eventsRes] = await Promise.all([
        databases.listDocuments<DayDocument>(DATABASE_ID, DAYS_COLLECTION_ID, [Query.orderAsc("date")]),
        databases.listDocuments<EventDocument>(DATABASE_ID, EVENTS_COLLECTION_ID)
      ]);

      const events = eventsRes.documents.map(e => ({
        $id: e.$id,
        title: e.title,
        time: e.time,
        place: e.place,
        road: e.road,
        team: e.team,
        day_id: e.day_id,
      }));

      const formatted = daysRes.documents.map(day => ({
        $id: day.$id,
        date: day.date,
        firstTeamName: day.first_team_name || "Я Воробушки",
        secondTeamName: day.second_team_name || "Лев и новенькие",
        boards: {
          first: events.filter(e => e.day_id === day.$id && e.team === "first"),
          second: events.filter(e => e.day_id === day.$id && e.team === "second"),
        },
      }));

      setDays(formatted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function addDay() {
    const value = prompt("Введите дату:");
    if (!value) return;
    await databases.createDocument(DATABASE_ID, DAYS_COLLECTION_ID, ID.unique(), {
      date: value,
      first_team_name: "Я Воробушки",
      second_team_name: "Лев и новенькие",
    });
    await loadData();
  }

  function startDayEdit(dayId: string, field: "date" | "firstTeamName" | "secondTeamName", value: string) {
    setEditingDayId(dayId);
    setEditingField(field);
    setEditValue(value);
  }

  async function saveDayEdit() {
    if (!editingDayId || !editingField) return;
    const data: any = {};
    if (editingField === "date") data.date = editValue;
    else if (editingField === "firstTeamName") data.first_team_name = editValue;
    else if (editingField === "secondTeamName") data.second_team_name = editValue;

    await databases.updateDocument(DATABASE_ID, DAYS_COLLECTION_ID, editingDayId, data);
    setEditingDayId(null);
    setEditingField(null);
    await loadData();
  }

  async function addEvent(dayId: string, team: "first" | "second") {
    await databases.createDocument(DATABASE_ID, EVENTS_COLLECTION_ID, ID.unique(), {
      title: "Новое выступление",
      time: "18:00",
      place: "",
      road: "",
      team,
      day_id: dayId,
    });
    await loadData();
  }

  async function deleteEvent(id: string) {
    if (!confirm("Удалить выступление?")) return;
    await databases.deleteDocument(DATABASE_ID, EVENTS_COLLECTION_ID, id);
    await loadData();
  }

  function startEdit(event: EventType) {
    setEditingEvent(event);
    setEditForm({
      title: event.title,
      time: event.time,
      place: event.place || "",
      road: event.road || "",
    });
  }

  async function saveEdit() {
    if (!editingEvent) return;
    await databases.updateDocument(DATABASE_ID, EVENTS_COLLECTION_ID, editingEvent.$id, {
      title: editForm.title,
      time: editForm.time,
      place: editForm.place,
      road: editForm.road,
    });
    setEditingEvent(null);
    await loadData();
  }

  async function quickRoad(event: EventType) {
    const value = prompt("Время в пути:", event.road || "");
    if (value === null) return;
    await databases.updateDocument(DATABASE_ID, EVENTS_COLLECTION_ID, event.$id, { road: value });
    await loadData();
  }

  async function onDrop(dayId: string, team: "first" | "second") {
    if (!dragged) return;
    await databases.updateDocument(DATABASE_ID, EVENTS_COLLECTION_ID, dragged.event.$id, {
      day_id: dayId,
      team
    });
    setDragged(null);
    await loadData();
  }

  // ==================== RENDER ====================

  function renderEvent(event: EventType, dayId: string) {
    return (
      <div key={event.$id} style={{ marginBottom: 16 }}>
        <div
          draggable
          onDragStart={() => setDragged({ event, dayId })}
          onClick={() => startEdit(event)}
          style={{ padding: "18px 20px", border: "1px solid #e0e7ff", borderRadius: 16, background: "#fff", boxShadow: "0 4px 15px rgba(0,0,0,0.06)", cursor: "grab" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>{event.time}</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#0f172a" }}>{event.title}</div>
              {event.place && <div style={{ fontSize: 15, color: "#475569", marginTop: 8 }}>📍 {event.place}</div>}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={(e) => { e.stopPropagation(); quickRoad(event); }} style={{ fontSize: 22 }}>🚗</button>
              <button onClick={(e) => { e.stopPropagation(); deleteEvent(event.$id); }} style={{ fontSize: 22 }}>🗑</button>
            </div>
          </div>
        </div>
        {event.road && <div style={{ marginLeft: 24, marginTop: 8, color: "#f59e0b", fontWeight: 600 }}>→ {event.road}</div>}
      </div>
    );
  }

  // ... (остальные render функции можно добавить при необходимости)

  if (loading) return <div style={{ padding: 50, textAlign: "center" }}>Загрузка...</div>;

  const selectedDay = days.find(d => d.$id === selectedDayId);

  if (!selectedDay) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h1>Dance Ops</h1>
        <button onClick={addDay} style={{ padding: 15, fontSize: 18 }}>Добавить дату</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: "0 auto" }}>
      <button onClick={() => setSelectedDayId(null)} style={{ background: "#1e2937", color: "white", padding: "12px 20px", borderRadius: 12, marginBottom: 20 }}>
        ← Даты
      </button>

      <h1 style={{ textAlign: "center", marginBottom: 30 }}>{selectedDay.date}</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* first column */}
        <div style={{ background: "#fff", padding: 20, borderRadius: 16 }}>
          <h2>{selectedDay.firstTeamName}</h2>
          {selectedDay.boards.first.map(e => renderEvent(e, selectedDay.$id))}
          <button onClick={() => addEvent(selectedDay.$id, "first")}>+ Добавить</button>
        </div>

        {/* second column */}
        <div style={{ background: "#fff", padding: 20, borderRadius: 16 }}>
          <h2>{selectedDay.secondTeamName}</h2>
          {selectedDay.boards.second.map(e => renderEvent(e, selectedDay.$id))}
          <button onClick={() => addEvent(selectedDay.$id, "second")}>+ Добавить</button>
        </div>
      </div>

      {/* Modal */}
      {editingEvent && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "white", padding: 30, borderRadius: 16, width: "90%", maxWidth: 400 }}>
            <h3>Редактировать</h3>
            <input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} placeholder="Название" style={{width:"100%", margin: "10px 0", padding: 10}} />
            <input value={editForm.time} onChange={e => setEditForm({...editForm, time: e.target.value})} placeholder="Время" style={{width:"100%", margin: "10px 0", padding: 10}} />
            <input value={editForm.place} onChange={e => setEditForm({...editForm, place: e.target.value})} placeholder="Место" style={{width:"100%", margin: "10px 0", padding: 10}} />
            <input value={editForm.road} onChange={e => setEditForm({...editForm, road: e.target.value})} placeholder="Время в пути" style={{width:"100%", margin: "10px 0", padding: 10}} />

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={saveEdit} style={{ flex: 1, padding: 14, background: "#4f46e5", color: "white", border: "none", borderRadius: 12 }}>Сохранить</button>
              <button onClick={() => setEditingEvent(null)} style={{ flex: 1, padding: 14, background: "#1e2937", color: "white", border: "none", borderRadius: 12 }}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
