import { createSlice } from "@reduxjs/toolkit";

let savedID = null;
if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
  const stored = localStorage.getItem("selectedMovieID");
  savedID = stored ? JSON.parse(stored) : null;
}

const selectMovieIDSlice = createSlice({
  name: "selectMovieID",
  initialState: {
    id: savedID,
  },
  reducers: {
    setSelectMovieID: (state, action) => {
      state.id = action.payload;
      if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
        localStorage.setItem("selectedMovieID", JSON.stringify(action.payload));
      }
    },
    clearSelectMovieID: (state) => {
      state.id = null;
      if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
        localStorage.removeItem("selectedMovieID");
      }
    },
  },
});

export const { setSelectMovieID, clearSelectMovieID } = selectMovieIDSlice.actions;
export default selectMovieIDSlice;
