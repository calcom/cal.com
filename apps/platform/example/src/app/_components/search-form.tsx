"use client";
import { SearchIcon } from "lucide-react";
import { toast } from "sonner";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { SubmitButton } from "./submit-button";
import { emitSearchEvent } from "../actions";
import { redirect, useRouter, useSearchParams } from "next/navigation";

export const SearchForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const val = e.target as HTMLFormElement;
    const search = val.search as HTMLInputElement;
    const newParams = new URLSearchParams(searchParams.toString());

    if (search.value) {
      newParams.set('q', search.value);
    } else {
      newParams.delete('q');
    }
    // create query params
    const paramsString = newParams.toString();
    const queryString = `${paramsString.length ? '?' : ''}${paramsString}`;

    router.push(`/search${queryString}`);
  }


  return (
    <form id="search-query" onSubmit={onSubmit}>
      <div className="mx-auto mt-6 flex max-w-7xl flex-col items-center space-y-8 px-6 lg:px-8">
        <div className="relative">
          <Label htmlFor="query" className="sr-only">
            Service
          </Label>
          <Input
            id="query"
            name="query"
            className="shadow-muted-foreground/8 block w-[35rem] rounded-full bg-muted/25 px-8 py-6 pr-12 text-base shadow-md"
            placeholder="Search for profession or service..."
          />
          <SearchIcon className="pointer-events-none absolute right-4 top-1/2 h-6 w-6 -translate-y-[50%] stroke-border" />
        </div>
        <SubmitButton>Search Marketplace</SubmitButton>
      </div>
    </form>
  );
};
