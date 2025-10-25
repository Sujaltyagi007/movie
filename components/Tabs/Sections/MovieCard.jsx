"use client";
import { Card } from "@/components/ui/card";
import { useSidebar } from "@/components/ui/sidebar";
import { setSelectMovieID } from "@/redux/slice/selectMovie";
import Link from "next/link";
import { useDispatch } from "react-redux";

export default function MovieCard({ data, error, Loading }) {
  const { open } = useSidebar();
  const dispatch = useDispatch();
  const handleSelectMovie = (id) => {
    dispatch(setSelectMovieID(id));
  };
  return (
    <div
      className={`${
        open ? "w-[calc(98.5vw_-_var(--sidebar-width))]" : "w-[97vw]"
      } transition-all duration-300 ease-in-out py-6 `}
    >
      <p className="px-[3%] mb-2 text-xl font-semibold">
        {data.name}{" "}
        <span className="text-[0.8rem] px-2 cursor-pointer transition-transform ease-in-out duration-200 hover:[transform:scale3d(1.1,1.1,1)]">
          See more
        </span>
      </p>

      <div className="flex gap-4 overflow-x-scroll moviecard px-4">
        {data?.status === "loading"
          ? Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="min-w-[28%] h-[30vh] bg-gray-800 rounded-2xl animate-pulse"
              ></div>
            ))
          : data?.data?.map((item, index) => (
              <Card
                key={index}
                style={{
                  backgroundImage: `url(https://image.tmdb.org/t/p/original/${item.backdrop_path})`,
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "cover",
                }}
                className="min-w-[28%] !cursor-grabbing group h-[30vh] relative flex justify-center items-center !p-0 text-nowrap overflow-hidden"
              >
                <Link
                  href={item.title}
                  onClick={() => handleSelectMovie(item.id)}
                  className=" group-hover:visible text-wrap !cursor-grab text-center invisible absolute bg-white/60 dark:bg-black/60 font-bold w-full h-full flex justify-center items-center "
                >
                  {item.title}
                </Link>
              </Card>
            ))}
      </div>
    </div>
  );
}
