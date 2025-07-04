import { Layout } from "@/components/layout/layout";
import { RepositionList } from "@/components/repositions/RepositionList";
import { useAuth } from "@/hooks/use-auth";

export default function RepositionsPage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <RepositionList userArea={user.area} />
    </Layout>
  );
}