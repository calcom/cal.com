import { Button, Input, Label } from "@shadcdn/ui";
import RemoveButton from "@ui/fayaz/RemoveButton";
import React from "react";

import EmptyState from "./EmptyState";
import FormBlock from "./FormBlock";

const BooksSection = ({ profile, setProfile, addBook, removeBook }) => {
  return (
    <FormBlock title="Books Published" description="Add details about books you've published">
      {!profile?.books?.length > 0 && <EmptyState label="Add details about books you've published" />}
      <div className="space-y-4 divide-y">
        {profile?.books?.length > 0 &&
          profile?.books?.map((book, i) => (
            <div key={i} className="relative space-y-4 pt-4">
              <div className="col-span-2">
                <Label>ISBN</Label>
                <Input
                  label="ISBN"
                  value={book.isbn}
                  onChange={(e) => {
                    const newBook = profile?.books?.length ? [...profile.books] : [];
                    newBook[i].isbn = e.target.value;
                    setProfile({
                      ...profile,
                      books: newBook,
                    });
                  }}
                />
              </div>
              <div className="col-span-full flex items-center justify-end">
                <RemoveButton label="Remove" onClick={() => removeBook(i)} />
              </div>
            </div>
          ))}
      </div>
      <div className="col-span-full mt-6">
        <Button onClick={() => addBook("books")} variant="outline" size="sm">
          Add section
        </Button>
      </div>
    </FormBlock>
  );
};

export default BooksSection;
