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

  const [dragged, setDragged] = useState<{ event: EventType; dayId: string } | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventType | null>(null);

  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<"date" | "firstTeamName" | "secondTeamName" | null>(null);
  const [editValue, setEditValue] = useState("");

  const [editForm, setEditForm] = useState({ title: "", time: "", place: "", road: "" });

  async function loadData() {
    setLoading(true);
    try {
      const daysRes = await databases.listDocuments(DATABASE_ID, DAYS_COLLECTION_ID, [Query.orderAsc("date")]);
      const eventsRes = await databases.listDocuments(DATABASE_ID, EVENTS_COLLECTION_ID);

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
    loadData();
  }, []);

  // ... (остальные функции addDay, startEdit, saveEdit и т.д. — если нужно, скажи, добавлю полностью)

  if (loading) return <div style={{ padding: 50, textAlign: "center" }}>Загрузка...</div>;

  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h1>Dance Ops</h1>
      <p>Приложение успешно задеплоено на Render!</p>
      <button onClick={loadData} style={{ padding: 12, marginTop: 20 }}>
        Перезагрузить данные
      </button>
    </div>
  );
}
