// All writes still require the signed-in administrator claim in database rules.
export async function deleteAdminItem(f, collection, item) {
  if (!["posts", "popups", "listings"].includes(collection) || !item?.id)
    throw Error("Invalid item selected for deletion.");
  const label = collection === "posts" ? "article" : collection === "popups" ? "pop-up" : "listing";
  if (
    !confirm(
      `Delete this ${label}: “${item.title}”?\n\nThis removes the saved item and cannot be undone here. Uploaded pictures are kept. Existing static exports must be rebuilt separately.`,
    )
  )
    return false;
  await f.d.deleteDoc(f.d.doc(f.db, collection, item.id));
  return true;
}
