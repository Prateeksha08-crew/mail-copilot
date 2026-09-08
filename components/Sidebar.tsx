"use client";

export function Sidebar({
  folder,
  onSelectFolder,
  onCompose,
}: {
  folder: "inbox" | "sent";
  onSelectFolder: (f: "inbox" | "sent") => void;
  onCompose: () => void;
}) {
  return (
    <div className="sidebar">
      <div className="brand">Postbox</div>
      <button className="compose-btn" onClick={onCompose}>
        Compose
      </button>
      <div className={`folder ${folder === "inbox" ? "active" : ""}`} onClick={() => onSelectFolder("inbox")}>
        Inbox
      </div>
      <div className={`folder ${folder === "sent" ? "active" : ""}`} onClick={() => onSelectFolder("sent")}>
        Sent
      </div>
    </div>
  );
}
