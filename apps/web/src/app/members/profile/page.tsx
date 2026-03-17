import { redirect } from "next/navigation";

export default function ProfilePage() {
  redirect("/members/profile/edit");
}
