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
  const [loadError, setLoadError] = useState("");
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
      }));

      const formatted: DayType[] = daysRes.documents.map((day) => ({
        $id: day.$id,
        date: day.date,
        firstTeamName: day.first_team_name || "Я Воробушки",
        secondTeamName: day.second_team_name || "Лев и новенькие",
        boards: {
          first: events.filter((event) => event.day_id === day.$id && event.team === "first"),
          second: events.filter((event) => event.day_id === day.$id && event.team === "second"),
        },
      }));

      setDays(formatted);
      setLoadError("");
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Неизвестная ошибка";
      setLoadError(`Не получилось загрузить даты из базы: ${message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function addDay() {
    const value = prompt("Введите дату:");
    if (!value) return;

    const day = await databases.createDocument<DayDocument>(DATABASE_ID, DAYS_COLLECTION_ID, ID.unique(), {
      date: value,
      first_team_name: "Я Воробушки",
      second_team_name: "Лев и новенькие",
    });

    await loadData();
    setSelectedDayId(day.$id);
  }

  function startDayEdit(dayId: string, field: "date" | "firstTeamName" | "secondTeamName", currentValue: string) {
    setEditingDayId(dayId);
    setEditingField(field);
    setEditValue(currentValue);
  }

  async function saveDayEdit() {
    if (!editingDayId || !editingField) return;

    const updateData: any = {};
    if (editingField === "date") updateData.date = editValue;
    if (editingField === "firstTeamName") updateData.first_team_name = editValue;
    if (editingField === "secondTeamName") updateData.second_team_name = editValue;

    await databases.updateDocument(DATABASE_ID, DAYS_COLLECTION_ID, editingDayId, updateData);

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
    const value = prompt("Время в пути:");
    if (!value) return;
    await databases.updateDocument(DATABASE_ID, EVENTS_COLLECTION_ID, event.$id, { road: value });
    await loadData();
  }

  async function onDrop(dayId: string, team: "first" | "second") {
    if (!dragged) return;
    await databases.updateDocument(DATABASE_ID, EVENTS_COLLECTION_ID, dragged.event.$id, { day_id: dayId, team });
    setDragged(null);
    await loadData();
  }

  // ===================== AUTH =====================
  if (!isClient) return <div style={{ padding: 40, textAlign: "center" }}>Загрузка...</div>;

  if (!isAuthed) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e2937 100%)",
      }}>
        <div style={{
          width: "100%",
          maxWidth: 380,
          padding: 40,
          background: "#1e2937",
          borderRadius: 24,
          boxShadow: "0 20px 50px rgba(0,0,0,0.4)",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎭</div>
          <h1 style={{ color: "white", fontSize: 32, fontWeight: 800, marginBottom: 32 }}>Dance Ops</h1>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Введите пароль"
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            style={{
              width: "100%",
              padding: 16,
              fontSize: 18,
              borderRadius: 12,
              border: "none",
              background: "#334155",
              color: "white",
              textAlign: "center",
              marginBottom: 16,
            }}
          />

          <button
            onClick={handleLogin}
            style={{
              width: "100%",
              padding: 16,
              background: "#4f46e5",
              color: "white",
              border: "none",
              borderRadius: 12,
              fontSize: 18,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Войти
          </button>
        </div>
      </div>
    );
  }

  // ===================== MAIN APP =====================
  function renderEvent(event: EventType, dayId: string) {
    return (
      <div key={event.$id} style={{ marginBottom: 16 }}>
        <div
          draggable
          onDragStart={() => setDragged({ event, dayId })}
          onClick={() => startEdit(event)}
          style={{
            padding: "20px 22px",
            border: "1px solid #e0e7ff",
            borderRadius: 16,
            background: "#ffffff",
            boxShadow: "0 4px 15px rgba(0,0,0,0.06)",
            cursor: "grab",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 29, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>{event.time}</div>
            <div style={{ fontSize: 18.5, fontWeight: 600, color: "#1e2937", lineHeight: 1.4 }}>{event.title}</div>
            {event.place && <div style={{ fontSize: 15.5, color: "#334155", marginTop: 8 }}>📍 {event.place}</div>}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={(e) => { e.stopPropagation(); quickRoad(event); }} style={{ fontSize: 22 }}>🚗</button>
            <button onClick={(e) => { e.stopPropagation(); deleteEvent(event.$id); }} style={{ fontSize: 22 }}>🗑</button>
          </div>
        </div>

        {event.road && (
          <div style={{ marginLeft: 24, marginTop: 10, color: "#f59e0b", fontWeight: 600 }}>
            → {event.road}
          </div>
        )}
      </div>
    );
  }

  function renderColumn(day: DayType, team: "first" | "second") {
    const items = day.boards[team];
    const teamName = team === "first" ? day.firstTeamName : day.secondTeamName;
    const teamField = team === "first" ? "firstTeamName" : "secondTeamName";

    return (
      <div style={{
        background: "#ffffff",
        borderRadius: 20,
        padding: 24,
        border: "1px solid #e2e8f0",
        boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
      }}>
        <div
          onClick={() => startDayEdit(day.$id, teamField, teamName)}
          style={{
            fontSize: 23,
            fontWeight: 700,
            padding: "14px 24px",
            background: "#1e2937",
            color: "white",
            borderRadius: 16,
            marginBottom: 24,
            cursor: "pointer",
            display: "inline-block",
          }}
        >
          {editingDayId === day.$id && editingField === teamField ? (
            <input 
              type="text" 
              value={editValue} 
              onChange={(e) => setEditValue(e.target.value)} 
              onBlur={saveDayEdit} 
              onKeyDown={(e) => e.key === "Enter" && saveDayEdit()} 
              autoFocus 
              style={{ background: "transparent", border: "none", color: "white", fontSize: 23, fontWeight: 700 }} 
            />
          ) : (
            teamName
          )}
        </div>

        <button onClick={() => addEvent(day.$id, team)} style={{ float: "right", fontSize: 24 }}>➕</button>

        <div style={{ clear: "both" }}>
          {items.map((event) => renderEvent(event, day.$id))}
        </div>
      </div>
    );
  }

  function renderStartPage() {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "40px 20px", fontFamily: "system-ui, Arial, sans-serif" }}>
        <h1 style={{ textAlign: "center", fontSize: 36, fontWeight: 800, color: "#1e2937", marginBottom: 40 }}>🎭 Dance Ops</h1>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 20, maxWidth: 1100, margin: "0 auto" }}>
          {days.map((day) => (
            <button
              key={day.$id}
              onClick={() => setSelectedDayId(day.$id)}
              style={{
                padding: 28,
                borderRadius: 20,
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                fontSize: 26,
                fontWeight: 800,
                color: "#0f172a",
                boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
                minHeight: 140,
              }}
            >
              {day.date}
            </button>
          ))}

          <button onClick={addDay} style={{
            padding: 28,
            borderRadius: 20,
            background: "#ffffff",
            border: "2px dashed #94a3b8",
            fontSize: 48,
            color: "#475569",
            minHeight: 140,
          }}>
            +
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <div style={{ padding: 50, textAlign: "center", fontSize: 18 }}>Загрузка...</div>;

  const selectedDay = days.find((day) => day.$id === selectedDayId);

  if (!selectedDay) return renderStartPage();

  return (
    <div style={{ padding: "20px 16px", background: "#f8fafc", minHeight: "100vh" }}>
      <button 
        onClick={() => setSelectedDayId(null)}
        style={{ 
          marginBottom: 20, 
          fontSize: 18, 
          padding: "10px 18px", 
          background: "#1e2937", 
          color: "white", 
          border: "none", 
          borderRadius: 12,
          fontWeight: 600
        }}
      >
        ← Назад к датам
      </button>

      <div style={{ marginBottom: 30 }}>
        <div
          onClick={() => startDayEdit(selectedDay.$id, "date", selectedDay.date)}
          style={{
            display: "inline-block",
            background: "#1e2937",
            color: "white",
            borderRadius: 18,
            padding: "14px 32px",
            fontSize: 32,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          {editingDayId === selectedDay.$id && editingField === "date" ? (
            <input 
              type="text" 
              value={editValue} 
              onChange={(e) => setEditValue(e.target.value)} 
              onBlur={saveDayEdit} 
              onKeyDown={(e) => e.key === "Enter" && saveDayEdit()} 
              autoFocus 
              style={{ background: "transparent", border: "none", color: "white", fontSize: 32, fontWeight: 800 }} 
            />
          ) : (
            selectedDay.date
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 24 }}>
        {renderColumn(selectedDay, "first")}
        {renderColumn(selectedDay, "second")}
      </div>

      {editingEvent && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "white", padding: 28, borderRadius: 20, width: "90%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <h3 style={{ marginBottom: 20, color: "#0f172a" }}>Редактировать выступление</h3>
            
            <input value={editForm.title} placeholder="Название" onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} style={{ width: "100%", padding: 14, marginBottom: 12, borderRadius: 12, border: "1px solid #94a3b8", fontSize: 16, color: "#0f172a" }} />
            <input value={editForm.time} placeholder="Время" onChange={(e) => setEditForm({ ...editForm, time: e.target.value })} style={{ width: "100%", padding: 14, marginBottom: 12, borderRadius: 12, border: "1px solid #94a3b8", fontSize: 16, color: "#0f172a" }} />
            <input value={editForm.place} placeholder="Место" onChange={(e) => setEditForm({ ...editForm, place: e.target.value })} style={{ width: "100%", padding: 14, marginBottom: 12, borderRadius: 12, border: "1px solid #94a3b8", fontSize: 16, color: "#0f172a" }} />
            <input value={editForm.road} placeholder="Время в пути" onChange={(e) => setEditForm({ ...editForm, road: e.target.value })} style={{ width: "100%", padding: 14, marginBottom: 24, borderRadius: 12, border: "1px solid #94a3b8", fontSize: 16, color: "#0f172a" }} />

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={saveEdit} style={{ flex: 1, padding: 16, background: "#4f46e5", color: "white", border: "none", borderRadius: 12, fontWeight: 600 }}>Сохранить</button>
              <button 
                onClick={() => setEditingEvent(null)} 
                style={{ 
                  flex: 1, 
                  padding: 16, 
                  background: "#1e2937", 
                  color: "white", 
                  border: "none", 
                  borderRadius: 12, 
                  fontWeight: 600 
                }}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
