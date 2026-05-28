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
  const [error, setError] = useState("");
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [editForm, setEditForm] = useState({ title: "", time: "", place: "", road: "" });

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      console.log("🔄 Загрузка данных...");

      const daysRes = await databases.listDocuments(DATABASE_ID, DAYS_COLLECTION_ID, [Query.orderAsc("date")]);
      const eventsRes = await databases.listDocuments(DATABASE_ID, EVENTS_COLLECTION_ID);

      console.log(`✅ Загружено дней: ${daysRes.documents.length}, событий: ${eventsRes.documents.length}`);

      // ... (форматирование данных как раньше)

      setDays(/* formatted days */);
    } catch (err: any) {
      console.error("❌ Ошибка загрузки:", err);
      setError(err.message || "Не удалось подключиться к базе");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <div style={{ padding: 50, textAlign: "center", fontSize: 18 }}>Загрузка данных...</div>;
  if (error) return <div style={{ padding: 50, textAlign: "center", color: "red" }}>Ошибка: {error}</div>;

  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h1>Dance Ops</h1>
      <p>Приложение загружено успешно!</p>
      <button onClick={loadData}>Перезагрузить данные</button>
    </div>
  );
}
