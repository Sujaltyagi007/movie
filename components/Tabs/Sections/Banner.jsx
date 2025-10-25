"use client";
import React, { useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";
import { Autoplay } from "swiper/modules";
import { useDispatch, useSelector } from "react-redux";
import { fetchMoviesBanner } from "@/redux/slice/movie";
import { useSidebar } from "@/components/ui/sidebar";
import Background from "@/store/Rectangle.svg";
import CircleProgess from "@/components/CircleProgess";

function Slider() {
  const { open } = useSidebar();
  const dispatch = useDispatch();
  const { data, status, error } = useSelector((state) => state.movie);
  useEffect(() => {
    dispatch(fetchMoviesBanner());
  }, []);
  console.log(data);
  return (
    <Swiper
      modules={[Autoplay]}
      spaceBetween={50}
      slidesPerView={1}
      pagination={{ clickable: true }}
      loop
      autoplay={{
        delay: 3000,
        disableOnInteraction: false,
      }}
      className={`${
        open
          ? "w-[calc(98vw_-_var(--sidebar-width))] left-2"
          : "w-[calc(97.5vw)] left-3"
      } h-[65vh] rounded-2xl absolute  top-2 `}
    >
      {status === "loading" ||
        status === "none" ||
        (status === "error" && (
          <SwiperSlide className="  border rounded-3xl  ">
            <div className=" animate-pulse text-center flex justify-center items-center h-full">
              {status === "error" && <p>Error: {error}</p>}
              {status === "loading" && <p>Loading movies...</p>}
            </div>
          </SwiperSlide>
        ))}
      {Array.isArray(data) &&
        data.map((movie) => (
          <SwiperSlide key={movie.id} className=" relative">
            {status === "loading" && <p className="">Loading movies...</p>}
            <img
              src={Background.src}
              alt="Background"
              className="w-full absolute object-cover object-bottom-left h-full"
            />
            <div className="absolute z-20 bottom-15 left-15  ">
              <h3 className={`text-[1.45rem] font-extrabold text-white`}>
                {movie.title || movie.original_title}
              </h3>
              <p className=" w-[30vw] line-clamp-2 text-white">
                {movie.overview}
              </p>
              <div className=" flex justify-start items-end gap-2 mt-4">
                <div className="">
                  <CircleProgess progress={movie.vote_average} />
                  <p className="px-2">{"IMDB "}</p>
                </div>
                <div>
                  <div className="flex justify-center gap-2">
                    <p className="bg-muted p-1 rounded-md">
                      {movie.release_date.slice(8, 10)}
                    </p>
                    <p className="bg-muted p-1 rounded-md">
                      {movie.release_date.slice(5, 7)}
                    </p>
                    <p className="bg-muted p-1 rounded-md">
                      {movie.release_date.slice(0, 4)}
                    </p>
                  </div>{" "}
                  <p className="px-2">{"Release Date "}</p>
                </div>
              </div>
            </div>
            <img
              src={`https://image.tmdb.org/t/p/original/${movie.backdrop_path}`}
              alt={movie.title}
              className="w-full h-full object-cover object-top"
            />
          </SwiperSlide>
        ))}
    </Swiper>
  );
}

export default function Banner() {
  return <Slider />;
}
