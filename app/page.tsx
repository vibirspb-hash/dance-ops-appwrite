"use client";

import { useEffect, useState } from "react";
import { ID, Query } from "appwrite";
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

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const DAYS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_DAYS_COLLECTION_ID!;
const EVENTS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_EVENTS_COLLECTION_ID!;

export default function Page() {
  const [days, setDays] = useState<DayType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);

      const daysRes = await databases.listDocuments(
        DATABASE_ID,
        DAYS_COLLECTION_ID,
        [Query.orderAsc("date")]
      );

      const eventsRes = await databases.listDocuments(
        DATABASE_ID,
        EVENTS_COLLECTION_ID
      );

      const events: EventType[] = eventsRes.documents.map((e: any) => ({
        $id: e.$id,
        title: e.title ?? "",
        time: e.time ?? "",
        place: e.place ?? "",
        road: e.road ?? "",
        team: e.team,
        day_id: e.day_id,
      }));

      const formatted: DayType[] = daysRes.documents.map((d: any) => ({
        $id: d.$id,
        date: d.date ?? "No date",
        firstTeamName: d.first_team_name ?? "Team A",
        secondTeamName: d.second_team_name ?? "Team B",
        boards: {
          first: events.filter(
            (e) => e.day_id === d.$id && e.team === "first"
          ),
          second: events.filter(
            (e) => e.day_id === d.$id && e.team === "second"
          ),
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
    const value = prompt("Введите дату");
    if (!value) return;

    await databases.createDocument(
      DATABASE_ID,
      DAYS_COLLECTION_ID,
      ID.unique(),
      {
        date: value,
        first_team_name: "Team A",
        second_team_name: "Team B",
      }
    );

    await loadData();
  }

  async function addEvent(dayId: string, team: "first" | "second") {
    await databases.createDocument(
      DATABASE_ID,
      EVENTS_COLLECTION_ID,
      ID.unique(),
      {
        title: "New event",
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
    await databases.deleteDocument(DATABASE_ID, EVENTS_COLLECTION_ID, id);
    await loadData();
  }

  const selectedDay = days.find((d) => d.$id === selectedDayId);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        Loading...
      </div>
    );
  }

  if (!selectedDay) {
    return (
      <div style={{ padding: 20, fontFamily: "sans-serif" }}>
        <h1>Dance Ops</h1>

        <button onClick={addDay} style={{ marginBottom: 20 }}>
          + Add day
        </button>

        <div style={{ display: "grid", gap: 10 }}>
          {days.map((d) => (
            <button
              key={d.$id}
              onClick={() => setSelectedDayId(d.$id)}
              style={{
                padding: 20,
                border: "1px solid #ddd",
                borderRadius: 10,
              }}
            >
              {d.date}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <button onClick={() => setSelectedDayId(null)}>
        ← Back
      </button>

      <h2>{selectedDay.date}</h2>

      <div style={{ display: "flex", gap: 20 }}>
        <div style={{ flex: 1 }}>
          <h3>{selectedDay.firstTeamName}</h3>

          <button onClick={() => addEvent(selectedDay.$id, "first")}>
            + Add
          </button>

          {selectedDay.boards.first.map((e) => (
            <div
              key={e.$id}
              style={{ border: "1px solid #ddd", marginTop: 10, padding: 10 }}
            >
              <b>{e.time}</b> {e.title}
              <button onClick={() => deleteEvent(e.$id)}>Delete</button>
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }}>
          <h3>{selectedDay.secondTeamName}</h3>

          <button onClick={() => addEvent(selectedDay.$id, "second")}>
            + Add
          </button>

          {selectedDay.boards.second.map((e) => (
            <div
              key={e.$id}
              style={{ border: "1px solid #ddd", marginTop: 10, padding: 10 }}
            >
              <b>{e.time}</b> {e.title}
              <button onClick={() => deleteEvent(e.$id)}>Delete</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
