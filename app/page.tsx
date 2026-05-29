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

type EventDocument = Models.Document & Omit<EventType, "$id">;

type DayDocument = Models.Document & {
  date: string;
  first_team_name?: string;
  second_team_name?: string;
};

/* ================= ENV ================= */

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "";
const DAYS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_DAYS_COLLECTION_ID ?? "";
const EVENTS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_EVENTS_COLLECTION_ID ?? "";

/* ================= COMPONENT ================= */

export default function Page() {
  const [days, setDays] = useState<DayType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  /* ================= LOAD DATA ================= */

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      if (!DATABASE_ID || !DAYS_COLLECTION_ID || !EVENTS_COLLECTION_ID) {
        throw new Error("ENV variables missing");
      }

      const daysRes = await databases.listDocuments<DayDocument>(
        DATABASE_ID,
        DAYS_COLLECTION_ID,
        [Query.orderAsc("date")]
      );

      const eventsRes = await databases.listDocuments<EventDocument>(
        DATABASE_ID,
        EVENTS_COLLECTION_ID
      );

      const events: EventType[] = eventsRes.documents.map((event) => ({
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
        firstTeamName: day.first_team_name || "Team A",
        secondTeamName: day.second_team_name || "Team B",
        boards: {
          first: events.filter((e) => e.day_id === day.$id && e.team === "first"),
          second: events.filter((e) => e.day_id === day.$id && e.team === "second"),
        },
      }));

      setDays(formatted);
    } catch (err) {
      console.error("LOAD ERROR:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  /* ================= INIT ================= */

  useEffect(() => {
    loadData();
  }, []);

  /* ================= UI ================= */

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        Загрузка...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40, color: "red", textAlign: "center" }}>
        Ошибка: {error}
      </div>
    );
  }

  const selectedDay = days.find((d) => d.$id === selectedDayId);

  if (!selectedDay) {
    return (
      <div style={{ padding: 40 }}>
        <h1>Dance Ops</h1>

        {days.map((day) => (
          <button
            key={day.$id}
            onClick={() => setSelectedDayId(day.$id)}
            style={{
              display: "block",
              margin: "10px 0",
              padding: 10,
              border: "1px solid #ccc",
            }}
          >
            {day.date}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <button onClick={() => setSelectedDayId(null)}>← Back</button>

      <h2>{selectedDay.date}</h2>

      <div style={{ display: "flex", gap: 20 }}>
        <div>
          <h3>{selectedDay.firstTeamName}</h3>
          {selectedDay.boards.first.map((e) => (
            <div key={e.$id}>{e.title}</div>
          ))}
        </div>

        <div>
          <h3>{selectedDay.secondTeamName}</h3>
          {selectedDay.boards.second.map((e) => (
            <div key={e.$id}>{e.title}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
