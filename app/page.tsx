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

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "main";
const DAYS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_DAYS_COLLECTION_ID ?? "days";
const EVENTS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_EVENTS_COLLECTION_ID ?? "events";

export default function Page() {
  const [days, setDays] = useState<DayType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [isAuthed, setIsAuthed] = useState(false);

  const [dragged, setDragged] = useState<{ event: EventType; dayId: string } | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventType | null>(null);
  const [editForm, setEditForm] = useState({ title: "", time: "", place: "", road: "" });

  // Auth
  useEffect(() => {
    if (localStorage.getItem("dance_auth") === "true") setIsAuthed(true);
  }, []);

  const handleLogin = () => {
    if (password === "1733") {
      localStorage.setItem("dance_auth", "true");
      setIsAuthed(true);
    } else {
      alert("Неверный пароль");
    }
  };

  async function loadData() {
    setLoading(true);
    try {
      const [daysRes, eventsRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, DAYS_COLLECTION_ID, [Query.orderAsc("date")]),
        databases.listDocuments(DATABASE_ID, EVENTS_COLLECTION_ID)
      ]);

      const events = eventsRes.documents.map((e: any) => ({
        $id: e.$id,
        title: e.title,
        time: e.time,
        place: e.place,
        road: e.road,
        team: e.team,
        day_id: e.day_id,
      }));

      const formatted = daysRes.documents.map((day: any) => ({
        $id: day.$id,
        date: day.date,
        firstTeamName: day.first_team_name || "Я Воробушки",
        secondTeamName: day.second_team_name || "Лев и новенькие",
        boards: {
          first: events.filter((e: any) => e.day_id === day.$id && e.team === "first"),
          second: events.filter((e: any) => e.day_id === day.$id && e.team === "second"),
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
    if (isAuthed) loadData();
  }, [isAuthed]);

  if (!isAuthed) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a" }}>
        <div style={{ background: "#1e2937", padding: 40, borderRadius: 20, width: 360, textAlign: "center" }}>
          <h1 style={{ color: "white", fontSize: 32, marginBottom: 30 }}>Dance Ops</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="Введите пароль"
            style={{ width: "100%", padding: 16, fontSize: 18, marginBottom: 20, borderRadius: 12, border: "none" }}
          />
          <button onClick={handleLogin} style={{ width: "100%", padding: 16, background: "#4f46e5", color: "white", border: "none", borderRadius: 12, fontSize: 18 }}>
            Войти
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <div style={{ padding: 50, textAlign: "center" }}>Загрузка...</div>;

  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h1>🎭 Dance Ops</h1>
      <p>Приложение успешно работает!</p>
      <button onClick={loadData} style={{ padding: 12, marginTop: 20 }}>Перезагрузить данные</button>
    </div>
  );
}
