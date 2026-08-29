import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { OREY_PATHS } from "@/constants/paths";
import { readData } from "@/utils/data";
import { useDialog } from "../../providers/dialog";
import { DialogSearchList } from "../dialog-search-list";

type SessionMeta = {
  id: string;
  goal: string;
  cwd: string;
  createdAt?: string;
};

export function SessionsDialogContent() {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const dialog = useDialog();
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const data = readData(OREY_PATHS.sessionsFile);
      if (data && Array.isArray(data.sessions)) {
        setSessions(data.sessions.reverse());
      }
    } catch {
      setSessions([]);
    }
  }, []);

  return (
    <DialogSearchList<SessionMeta>
      items={sessions}
      placeholder="Search past sessions..."
      emptyText="No past sessions found"
      filterFn={(item, query) =>
        item.goal.toLowerCase().includes(query.toLowerCase()) ||
        item.id.toLowerCase().includes(query.toLowerCase())
      }
      getKey={(item) => item.id}
      onSelect={(item) => {
        dialog.close();
        navigate(`/sessions/${item.id}`);
      }}
      renderItem={(item, isSelected) => {
        const title = item.goal.length > 50 ? item.goal.slice(0, 47) + "..." : item.goal;
        return (
          <box
            flexDirection="row"
            justifyContent="space-between"
            width="100%"
            paddingX={1}
          >
            <text fg={isSelected ? "black" : "white"}>{title || item.id}</text>
          </box>
        );
      }}
    />
  );
}
