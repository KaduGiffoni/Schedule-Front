import React from "react";

export const containerStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  border: "1px solid var(--color-border)",
  borderRadius: "10px",
  overflow: "clip",
  backgroundColor: "var(--color-surface)",
  boxShadow: "var(--shadow-sm)",
  position: "relative",
};

export const toolbarStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "2px",
  padding: "6px 10px",
  borderBottom: "1px solid var(--color-border-subtle)",
  backgroundColor: "var(--color-surface-dim)",
  position: "sticky",
  top: 0,
  zIndex: 10,
  backdropFilter: "blur(8px)",
};

export const editorContainerStyle: React.CSSProperties = {
  backgroundColor: "var(--color-surface)",
  flex: 1,
  display: "flex",
  flexDirection: "column",
};