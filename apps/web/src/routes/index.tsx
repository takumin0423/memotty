import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <h1>memotty</h1>
      <p>メモを取るためのプロダクト</p>
    </div>
  );
}
