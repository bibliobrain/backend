import database from '../utils/database';

import type {
  TBook,
  TBooksNormalized,
  TBookWithAuthorsAndSubjects,
  TGetBooksFilter,
  TGetBooksPagination,
} from './types';

const getBooks = async (
  pagination: TGetBooksPagination,
  filters: TGetBooksFilter,
) => {
  const queryResult = await database('dbo.books')
    .select(
      'isbn',
      'title',
      'description',
      'edition',
      'language',
      'bindingType',
      'itemId',
      'name as subject',
      database.raw('CONCAT(fname, \' \', lname) as "author"'),
    )
    .rightJoin('bookAuthors', 'books.isbn', 'bookAuthors.bookIsbn')
    .rightJoin('bookSubjects', 'books.isbn', 'bookSubjects.bookIsbn')
    .modify(function (queryBuilder) {
      for (const [key, value] of Object.entries(filters)) {
        if (!value) {
          return;
        }
        void queryBuilder.where(
          key === 'subject' ? 'name' : key,
          'like',
          `%${value}%`,
        );
      }
    })
    .orderBy('isbn', 'asc')
    .paginate<TBook[]>({
      currentPage: Number.parseInt(pagination.page, 10) || 1,
      perPage: 50,
    });

  const books = queryResult.data.reduce(
    (books: TBooksNormalized, { author, subject, ...book }: TBook) => {
      const entry = books[book.isbn] || {
        ...book,
        authors: [],
        subjects: [],
      };

      if (!entry.authors.includes(author)) {
        entry.authors.push(author);
      }

      if (!entry.subjects.includes(subject)) {
        entry.subjects.push(subject);
      }

      books[book.isbn] = entry;
      return books;
    },
    {},
  );

  const booksValues: TBookWithAuthorsAndSubjects[] = Object.values(books);

  return { data: booksValues, pagination: queryResult.pagination };
};

export { getBooks };
