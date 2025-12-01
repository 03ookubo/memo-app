/**
 * Note Service - エクスポート
 */

// Read operations
export {
  listActiveNotes,
  listArchivedNotes,
  listDeletedNotes,
  getNoteById,
  listChildNotes,
  type ListNotesInput,
} from "./note.read.service";

// Write operations
export {
  createNote,
  updateNote,
  addTaskToNote,
  removeTaskFromNote,
  updateNoteSortIndex,
  type CreateNoteInput,
  type UpdateNoteInput,
} from "./note.write.service";

// Archive operations
export {
  archiveNote,
  unarchiveNote,
  archiveNotes,
  unarchiveNotes,
} from "./note.archive.service";

// Delete operations
export {
  softDeleteNote,
  restoreNote,
  hardDeleteNote,
  softDeleteNotes,
  restoreNotes,
  emptyTrash,
} from "./note.delete.service";
