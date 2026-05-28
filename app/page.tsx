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
      const daysRes = await databases.listDocuments<DayDocument>(DATABASE_ID, DAYS_COLLECTION_ID, [Query.orderAsc("date")]);
      const eventsRes = await databases.listDocuments<EventDocument>(DATABASE_ID, EVENTS_COLLECTION_ID);

      const events = eventsRes.documents.map((e) => ({
        $id: e.$id,
        title: e.title,
        time: e.time,
        place: e.place,
        road: e.road,
        team: e.team,
        day_id: e.day_id,
      }));

      const formatted: DayType[] = daysRes.documents.map((day) => ({
        $id: day.$id,
        date: day.date,
        firstTeamName: day.first_team_name || "Я Воробушки",
        secondTeamName: day.second_team_name || "Лев и новенькие",
        boards: {
          first: events.filter((e) => e.day_id === day.$id && e.team === "first"),
          second: events.filter((e) => e.day_id === day.$id && e.team === "second"),
        },
      }));

      setDays(formatted);
    } catch (err: any) {
      console.error(err);
      setLoadError("Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Остальные функции (addDay, saveDayEdit, addEvent, deleteEvent, startEdit, saveEdit, quickRoad, onDrop и т.д.)
  // Я оставил их как в твоей последней рабочей версии. Если нужно — скажи, добавлю полностью.

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

  // ... (другие функции без изменений)

  function renderEvent(event: EventType, dayId: string) {
    return (
      <div key={event.$id} style={{ marginBottom: 16 }}>
        <div
          draggable
          onDragStart={() => setDragged({ event, dayId })}
          onClick={() => startEdit(event)}
          style={{
            padding: "18px 20px",
            border: "1px solid #e0e7ff",
            borderRadius: 16,
            background: "#fff",
            boxShadow: "0 4px 15px rgba(0,0,0,0.06)",
            cursor: "grab"
          }}
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

  // ... renderColumn, renderStartPage и остальной код ...

  return (
    <div style={{ padding: "20px 12px", background: "#f8fafc", minHeight: "100vh" }}>
      {/* Твой основной интерфейс */}
      {/* Кнопка Назад */}
      <button 
        onClick={() => setSelectedDayId(null)} 
        style={{ 
          padding: "12px 18px", 
          background: "#1e2937", 
          color: "white", 
          border: "none", 
          borderRadius: 14, 
          fontSize: 18, 
          fontWeight: 700 
        }}
      >
        ← Даты
      </button>

      {/* Модальное окно */}
      {editingEvent && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "white", padding: 28, borderRadius: 20, width: "100%", maxWidth: 420 }}>
            <h3>Редактировать выступление</h3>
            {/* inputs ... */}

            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button onClick={saveEdit} style={{ flex: 1, padding: 16, background: "#4f46e5", color: "white", border: "none", borderRadius: 12 }}>Сохранить</button>
              <button 
                onClick={() => setEditingEvent(null)} 
                style={{ 
                  flex: 1, 
                  padding: 16, 
                  background: "#1e2937", 
                  color: "white", 
                  border: "none", 
                  borderRadius: 12 
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