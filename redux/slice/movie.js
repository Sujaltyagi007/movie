import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

export const fetchMoviesBanner = createAsyncThunk(
  "movies/fetchMovies",
  async () => {
    const response = await fetch(
      "https://api.themoviedb.org/3/discover/movie?include_adult=false&include_video=false&language=en-US&page=1&sort_by=popularity.desc",
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

const moviesSlice = createSlice({
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
      .addCase(fetchMoviesBanner.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchMoviesBanner.fulfilled, (state, action) => {
        state.data = action.payload;
        state.status = "success";
      })
      .addCase(fetchMoviesBanner.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      });
  },
});
export const { setData } = moviesSlice.actions;
export default moviesSlice;
