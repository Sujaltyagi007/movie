"use client";
import React, { useEffect } from "react";
import Banner from "./Sections/Banner";
import MovieCard from "./Sections/MovieCard";
import { useDispatch, useSelector } from "react-redux";
import { fetchTopRatedMovies } from "@/redux/slice/toprated";
import { popularMovies } from "@/redux/slice/popular";

export default function Home() {
  const dispatch = useDispatch();
  const [Loading, setLoading] = React.useState(true);
  const {
    data: topRatedData,
    status: topRatedStatus,
    error: topRatedError,
  } = useSelector((state) => state.topRatedMovie);
  const {
    data: popularData,
    status: popularStatus,
    error: popularError,
  } = useSelector((state) => state.popularMovies);

  useEffect(() => {
    setLoading(true);
    if (topRatedStatus === "none") {
      dispatch(fetchTopRatedMovies());
    }
    if (popularStatus === "none") {
      dispatch(popularMovies());
    }
    setLoading(false);
  }, [dispatch, topRatedStatus, popularStatus]);

  return (
    <div className="absolute ">
      <Banner />
      <MovieCard
        data={{
          data: topRatedData,
          error: topRatedError,
          Loading,
          name: "Top Rated",
        }}
      />
      <MovieCard
        data={{
          data: popularData,
          status: popularStatus,
          error: popularError,
          name: "Popular Movies",
        }}
      />
    </div>
  );
}
