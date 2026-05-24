"use client";

import { useEffect, useState } from "react";
import { databases, ID, Query } from "../lib/appwrite";

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

export default function Page() {
  const [days, setDays] = useState<DayType[]>([]);
  const [loading, setLoading] = useState(true);

  const [dragged, setDragged] = useState<{ event: EventType; dayId: string } | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventType | null>(null);

  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<"date" | "firstTeamName" | "secondTeamName" | null>(null);
  const [editValue, setEditValue] = useState("");

  const [editForm, setEditForm] = useState({ title: "", time: "", place: "", road: "" });

  async function loadData() {
    setLoading(true);
    try {
      const daysRes = await databases.listDocuments('main', 'days', [Query.orderAsc('date')]);
      const eventsRes = await databases.listDocuments('main', 'events');

      const formatted = daysRes.documents.map((day: any) => ({
        $id: day.$id,
        date: day.date,
        firstTeamName: day.first_team_name || "Я Воробушки",
        secondTeamName: day.second_team_name || "Лев и новенькие",
        boards: {
          first: eventsRes.documents.filter((e: any) => e.day_id === day.$id && e.team === "first"),
          second: eventsRes.documents.filter((e: any) => e.day_id === day.$id && e.team === "second"),
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

    await databases.updateDocument('main', 'days', editingDayId, updateData);

    setEditingDayId(null);
    setEditingField(null);
    await loadData();
  }

  async function addEvent(dayId: string, team: "first" | "second") {
    await databases.createDocument('main', 'events', ID.unique(), {
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
    await databases.deleteDocument('main', 'events', id);
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
    await databases.updateDocument('main', 'events', editingEvent.$id, {
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
    await databases.updateDocument('main', 'events', event.$id, { road: value });
    await loadData();
  }

  async function onDrop(dayId: string, team: "first" | "second") {
    if (!dragged) return;
    await databases.updateDocument('main', 'events', dragged.event.$id, { day_id: dayId, team });
    setDragged(null);
    await loadData();
  }

  if (loading) return <div style={{ padding: 50, textAlign: "center", fontSize: 18 }}>Загрузка...</div>;

  return (
    <div style={{ padding: "20px 12px", background: "#f8fafc", minHeight: "100vh", fontFamily: "system-ui, Arial, sans-serif" }}>
      <h1 style={{ textAlign: "center", fontSize: 32, marginBottom: 40 }}>🎭 Dance Ops</h1>

      {days.map((day) => (
        <div key={day.$id} style={{ marginBottom: 60 }}>
          <div onClick={() => startDayEdit(day.$id, "date", day.date)} style={{ display: "inline-block", background: "#1e2937", color: "white", borderRadius: 18, padding: "14px 32px", fontSize: 32, fontWeight: 800, marginBottom: 24, cursor: "pointer" }}>
            {editingDayId === day.$id && editingField === "date" ? (
              <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={saveDayEdit} onKeyDown={(e) => e.key === "Enter" && saveDayEdit()} autoFocus style={{ background: "transparent", border: "none", color: "white", fontSize: 32, fontWeight: 800 }} />
            ) : (
              day.date
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 24 }}>
            {["first", "second"].map((t) => {
              const team = t as "first" | "second";
              const items = day.boards[team];
              const teamName = team === "first" ? day.firstTeamName : day.secondTeamName;
              const teamField = team === "first" ? "firstTeamName" : "secondTeamName";

              return (
                <div key={team} style={{ background: "#fff", borderRadius: 20, padding: 24, border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(0,0,0,0.06)" }}>
                  <div onClick={() => startDayEdit(day.$id, teamField, teamName)} style={{ fontSize: 22, fontWeight: 700, padding: "12px 24px", background: "#1e2937", color: "white", borderRadius: 14, marginBottom: 24, cursor: "pointer" }}>
                    {editingDayId === day.$id && editingField === teamField ? (
                      <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={saveDayEdit} onKeyDown={(e) => e.key === "Enter" && saveDayEdit()} autoFocus style={{ background: "transparent", border: "none", color: "white", fontSize: 22, fontWeight: 700 }} />
                    ) : (
                      teamName
                    )}
                  </div>

                  <button onClick={() => addEvent(day.$id, team)} style={{ float: "right", fontSize: 24 }}>➕</button>

                  <div style={{ clear: "both" }}>
                    {items.map((event) => (
                      <div key={event.$id} style={{ marginBottom: 16 }}>
                        <div draggable onDragStart={() => setDragged({ event, dayId: day.$id })} onClick={() => startEdit(event)} style={{ padding: "18px 20px", border: "1px solid #e0e7ff", borderRadius: 16, background: "#fff", boxShadow: "0 4px 15px rgba(0,0,0,0.06)", cursor: "grab" }}>
                          <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>{event.time}</div>
                          <div style={{ fontSize: 18, fontWeight: 600 }}>{event.title}</div>
                          {event.place && <div style={{ fontSize: 15, color: "#475569", marginTop: 8 }}>📍 {event.place}</div>}
                        </div>
                        {event.road && <div style={{ marginLeft: 24, marginTop: 8, color: "#f59e0b", fontWeight: 600 }}>→ {event.road}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
