"use client";

import { useEffect, useState } from "react";
import { ID, Query, type Models } from "appwrite";
import { databases } from "../lib/appwrite";

/* ================= TYPES ================= */

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

type DayDocument = Models.Document & {
  date: string;
  first_team_name?: string;
  second_team_name?: string;
};

/* ================= ENV ================= */

const DATABASE_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "main";

const DAYS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DAYS_COLLECTION_ID ?? "days";

const EVENTS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_EVENTS_COLLECTION_ID ?? "events";

/* ================= STYLES ================= */

const inputStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  background: "transparent",
  border: "none",
  color: "white",
  fontWeight: 800,
  outline: "none",
};

/* ================= PAGE ================= */

export default function Page() {
  const [days, setDays] = useState<DayType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  const [dragged, setDragged] =
    useState<{ event: EventType; dayId: string } | null>(null);

  const [editingEvent, setEditingEvent] = useState<EventType | null>(null);

  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<
    "date" | "firstTeamName" | "secondTeamName" | null
  >(null);

  const [editValue, setEditValue] = useState("");

  const [editForm, setEditForm] = useState({
    title: "",
    time: "",
    place: "",
    road: "",
  });

  /* ================= LOAD DATA ================= */

  async function loadData() {
    setLoading(true);
    setLoadError("");

    try {
      const daysRes = await databases.listDocuments<DayDocument>(
        DATABASE_ID,
        DAYS_COLLECTION_ID,
        [Query.orderAsc("date")]
      );

      const eventsRes = await databases.listDocuments(
        DATABASE_ID,
        EVENTS_COLLECTION_ID
      );

      const events = eventsRes.documents as unknown as EventType[];

      const formatted: DayType[] = daysRes.documents.map((day) => ({
        $id: day.$id,
        date: day.date,
        firstTeamName: day.first_team_name || "Я Воробушки",
        secondTeamName: day.second_team_name || "Лев и новенькие",
        boards: {
          first: events.filter(
            (e) => e.day_id === day.$id && e.team === "first"
          ),
          second: events.filter(
            (e) => e.day_id === day.$id && e.team === "second"
          ),
        },
      }));

      setDays(formatted);
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : "Неизвестная ошибка";
      setLoadError(
        `Не получилось загрузить даты из базы: ${message}`
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  /* ================= CRUD ================= */

  async function addDay() {
    const value = prompt("Введите дату:");
    if (!value) return;

    const day = await databases.createDocument(
      DATABASE_ID,
      DAYS_COLLECTION_ID,
      ID.unique(),
      {
        date: value,
        first_team_name: "Я Воробушки",
        second_team_name: "Лев и новенькие",
      }
    );

    await loadData();
    setSelectedDayId(day.$id);
  }

  async function addEvent(dayId: string, team: "first" | "second") {
    await databases.createDocument(
      DATABASE_ID,
      EVENTS_COLLECTION_ID,
      ID.unique(),
      {
        title: "Новое выступление",
        time: "18:00",
        place: "",
        road: "",
        team,
        day_id: dayId,
      }
    );

    await loadData();
  }

  async function deleteEvent(id: string) {
    await databases.deleteDocument(
      DATABASE_ID,
      EVENTS_COLLECTION_ID,
      id
    );

    await loadData();
  }

  async function saveEdit() {
    if (!editingEvent) return;

    await databases.updateDocument(
      DATABASE_ID,
      EVENTS_COLLECTION_ID,
      editingEvent.$id,
      {
        title: editForm.title,
        time: editForm.time,
        place: editForm.place,
        road: editForm.road,
      }
    );

    setEditingEvent(null);
    await loadData();
  }

  async function onDrop(dayId: string, team: "first" | "second") {
    if (!dragged) return;

    await databases.updateDocument(
      DATABASE_ID,
      EVENTS_COLLECTION_ID,
      dragged.event.$id,
      { day_id: dayId, team }
    );

    setDragged(null);
    await loadData();
  }

  /* ================= RENDER EVENT ================= */

  function renderEvent(event: EventType, dayId: string) {
    return (
      <div key={event.$id} style={{ marginBottom: 16 }}>
        <div
          draggable
          onDragStart={() => setDragged({ event, dayId })}
          onClick={() => {
            setEditingEvent(event);
            setEditForm({
              title: event.title,
              time: event.time,
              place: event.place || "",
              road: event.road || "",
            });
          }}
          style={{
            padding: 18,
            borderRadius: 16,
            background: "#fff",
            border: "1px solid #e0e7ff",
            cursor: "grab",
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 800 }}>
            {event.time}
          </div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>
            {event.title}
          </div>

          {event.place && (
            <div style={{ fontSize: 14, color: "#475569" }}>
              {event.place}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ================= COLUMN ================= */

  function renderColumn(day: DayType, team: "first" | "second") {
    const items = day.boards[team];

    const teamName =
      team === "first"
        ? day.firstTeamName
        : day.secondTeamName;

    return (
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => onDrop(day.$id, team)}
        style={{
          background: "#fff",
          padding: 18,
          borderRadius: 20,
        }}
      >
        <h3>{teamName}</h3>

        <button onClick={() => addEvent(day.$id, team)}>
          + add
        </button>

        {items.map((e) => renderEvent(e, day.$id))}
      </div>
    );
  }

  /* ================= UI ================= */

  if (loading) return <div>Loading...</div>;

  const selectedDay = days.find(
    (d) => d.$id === selectedDayId
  );

  if (!selectedDay) {
    return (
      <div>
        <h1>Dance Ops</h1>

        {days.map((d) => (
          <button
            key={d.$id}
            onClick={() => setSelectedDayId(d.$id)}
          >
            {d.date}
          </button>
        ))}

        <button onClick={addDay}>+ Add day</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <button onClick={() => setSelectedDayId(null)}>
        Back
      </button>

      <h1>{selectedDay.date}</h1>

      <div style={{ display: "flex", gap: 20 }}>
        {renderColumn(selectedDay, "first")}
        {renderColumn(selectedDay, "second")}
      </div>

      {editingEvent && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: 20,
              margin: "10% auto",
              width: 300,
            }}
          >
            <input
              value={editForm.title}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  title: e.target.value,
                })
              }
            />

            <button onClick={saveEdit}>
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
