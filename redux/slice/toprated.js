import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

export const fetchTopRatedMovies = createAsyncThunk(
  "movies/fetchTopRatedMovies",
  async () => {
    const response = await fetch(
      "https://api.themoviedb.org/3/movie/top_rated?language=en-US&page=1",
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
  }
);

const topRatedMoviesSlice = createSlice({
  name: "topRatedMovies",
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
      .addCase(fetchTopRatedMovies.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchTopRatedMovies.fulfilled, (state, action) => {
        state.data = action.payload;
        state.status = "success";
      })
      .addCase(fetchTopRatedMovies.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      });
  },
});
export const { setData } = topRatedMoviesSlice.actions;
export default topRatedMoviesSlice;
