import { createSlice } from "@reduxjs/toolkit";
export const activeTabSlice = createSlice({
  name: "activeTab",
  initialState: {
    activeTab: 0,
  },
  reducers: {
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
    },
  },
});

export const { setActiveTab } = activeTabSlice.actions;
export default activeTabSlice;
