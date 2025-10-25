import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

export const popularMovies = createAsyncThunk("movies/popularMovies", async () => {
  const response = await fetch(
    "https://api.themoviedb.org/3/movie/popular?language=en-US&page=1",
    {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization:
          "Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI5NzA3NThjNjIwNTJlMTRjNjU0MGJiMmUxNTQwZGJhOSIsIm5iZiI6MTc0NTY2MDAzNC40MjUsInN1YiI6IjY4MGNhODgyZjc1ZDZmNDcxODM3ODA3OSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.IkXXkS6V8QiuXtxSpwKXQbwj3QPFkJfFWwtuUvWjzHM",
      },
    }
  );
  if (!response.ok) {
    throw new Error("Failed to fetch movies");
  }
  return (await response.json()).results;
});

const popularMoviesSlice = createSlice({
  name: "movies",
  initialState: { data: [], status: "none", error: null },
  reducers: {
    setData(state, action) {
      state.data = action.payload;
      state.status = "success";
    },
  },
  reducers: {
    setData(state, action) {
      state.data = action.payload;
      state.status = "success";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(popularMovies.pending, (state) => {
        state.status = "loading";
      })
      .addCase(popularMovies.fulfilled, (state, action) => {
        state.data = action.payload;
        state.status = "success";
      })
      .addCase(popularMovies.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      });
  },
});
export const { setData } = popularMoviesSlice.actions;
export default popularMoviesSlice;
