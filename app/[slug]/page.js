"use client";
import { fetchMoviesById } from "@/redux/slice/findMovie";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

export default function Page() {
  const dispatch = useDispatch();
  const id = useSelector((state) => state.selectMovieID.id);
  useEffect(() => {
    if (id) {
      dispatch(fetchMoviesById({ id }));
    }
  }, [dispatch, id]);
  const result = useSelector((state) => state.findMovie);
  return (
    <div className="flex justify-center items-center h-dvh">
      {result.status === "loading" && <p>Loading...</p>}
      {result.status === "success" && (
        <div>
          <h1>{result.data.title}</h1>
          <p>{result.data.overview}</p>
        </div>
      )}
      {result.status === "failed" && <p>Error: {result.error}</p>}
    </div>
  );
}
