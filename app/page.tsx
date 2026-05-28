"use client";

import { useEffect, useState } from "react";
import { Query, type Models } from "appwrite";
import { databases } from "../lib/appwrite";

type EventType = Models.Document & {
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

const DATABASE_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ??
  "6a11e58800228e8fb2fd";

const DAYS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DAYS_COLLECTION_ID ??
  "days";

const EVENTS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_EVENTS_COLLECTION_ID ??
  "events";

export default function Page() {
  const [days, setDays] = useState<DayType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      console.log("🔄 Загрузка данных...");

      const daysRes = await databases.listDocuments(
        DATABASE_ID,
        DAYS_COLLECTION_ID,
        [Query.orderAsc("\$createdAt")]
      );

      const eventsRes = await databases.listDocuments(
        DATABASE_ID,
        EVENTS_COLLECTION_ID
      );

      console.log(
        `✅ Загружено дней: ${daysRes.documents.length}, событий: ${eventsRes.documents.length}`
      );

      const formatted: DayType[] = daysRes.documents.map((day: any) => ({
        $id: day.$id,
        date: day.date || "",
        firstTeamName:
          day.first_team_name || "Я Воробушки",
        secondTeamName:
          day.second_team_name || "Лев и новенькие",

        boards: {
          first: eventsRes.documents.filter(
            (e: any) =>
              e.day_id === day.$id &&
              e.team === "first"
          ) as EventType[],

          second: eventsRes.documents.filter(
            (e: any) =>
              e.day_id === day.$id &&
              e.team === "second"
          ) as EventType[],
        },
      }));

      setDays(formatted);
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

  if (loading) {
    return (
      <div
        style={{
          padding: 50,
          textAlign: "center",
          fontSize: 18,
        }}
      >
        Загрузка данных...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: 50,
          textAlign: "center",
          color: "red",
          fontSize: 18,
        }}
      >
        Ошибка: {error}
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: 40,
        fontFamily: "system-ui",
      }}
    >
      <h1
        style={{
          textAlign: "center",
          fontSize: 38,
          fontWeight: 800,
          marginBottom: 40,
          color: "#1e2937",
        }}
      >
        🎭 Dance Ops
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 20,
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        {days.map((day) => (
          <button
            key={day.$id}
            onClick={() => setSelectedDayId(day.$id)}
            style={{
              background: "white",
              border: "1px solid #cbd5e1",
              borderRadius: 20,
              minHeight: 140,
              fontSize: 28,
              fontWeight: 800,
              color: "#0f172a",
              boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
              cursor: "pointer",
              transition: "0.2s",
            }}
          >
            {day.date}
          </button>
        ))}
      </div>
    </div>
  );
}
