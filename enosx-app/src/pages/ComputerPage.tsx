import { GlobalLayout } from "@/components/GlobalLayout";
import { ComputerWorkspace } from "@/components/computer/ComputerWorkspace";
import { ComputerWorkspaceProvider } from "@/contexts/ComputerWorkspaceContext";

export default function ComputerPage() {
  return (
    <GlobalLayout>
      <ComputerWorkspaceProvider>
        <ComputerWorkspace />
      </ComputerWorkspaceProvider>
    </GlobalLayout>
  );
}
