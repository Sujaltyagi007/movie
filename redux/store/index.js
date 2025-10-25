import { configureStore } from "@reduxjs/toolkit";
import movieSlice from "../slice/movie";
import topRatedMoviesSlice from "../slice/toprated";
import popularMoviesSlice from "../slice/popular";
import selectMovieIDSlice from "../slice/selectMovie";
import findMovieSlice from "../slice/findMovie";
import activeTabSlice from "../slice/activeTab";

const store = configureStore({
  reducer: {
    movie: movieSlice.reducer,
    topRatedMovie: topRatedMoviesSlice.reducer,
    popularMovies: popularMoviesSlice.reducer,
    selectMovieID: selectMovieIDSlice.reducer,
    findMovie: findMovieSlice.reducer,
    activeTab: activeTabSlice.reducer,
  },
});

export default store;
