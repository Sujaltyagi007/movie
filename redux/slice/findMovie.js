const { createSlice, createAsyncThunk } = require("@reduxjs/toolkit");
export const fetchMoviesById = createAsyncThunk(
  "movies/fetchMovies",
  async ({ id }) => {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${id}?language=en-US`,
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
    return await response.json();
  }
);

const findMovieSlice = createSlice({
  name: "findMovie",
  initialState: { data: null, status: "none", error: null },
  reducers: {
    setFindMovieID: (state, action) => {
      state.data = action.payload; // Only use this if needed
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMoviesById.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchMoviesById.fulfilled, (state, action) => {
        state.data = action.payload;
        state.status = "success";
      })
      .addCase(fetchMoviesById.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      });
  },
});

export const { setFindMovieID } = findMovieSlice.actions;
export default findMovieSlice;
