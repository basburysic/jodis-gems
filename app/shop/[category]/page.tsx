import { redirect } from "next/navigation";

// The shop now lives at "/" (single collection, no more category picker).
// This route only exists so old /shop/paparazzi or /shop/bomb_party links
// still go somewhere sensible instead of 404ing.
export default function ShopCategoryRedirect() {
  redirect("/");
}
