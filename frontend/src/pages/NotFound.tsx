import { useNavigate } from "react-router-dom";

import { Button, MessagePanel } from "../components/ui.tsx";

export function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-[520px] px-5 py-6">
      <MessagePanel
        icon="?"
        title="This page does not exist."
        action={
          <Button
            variant="secondary"
            onClick={() => navigate("/")}
            className="mt-2 min-h-[50px] rounded-[14px] px-[22px] text-base"
          >
            Back to Kepter
          </Button>
        }
      >
        Check the link, or start from the home page.
      </MessagePanel>
    </div>
  );
}
