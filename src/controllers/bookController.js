import { fetchBooks } from "../utils/externalAPI";
import Book from "../models/bookModels";
import User from "../models/userModels";

export const addBook = async (req, res) => {
    try {
        const userId = req.user._id;
        const { title, author, genre, publishedDate } = req.body;

        if (!title || !author) {
            return res.status(400).json({ message: "Title and Author are required" });
        }

        if (req.query.fromApi) {
            const query = `intitle:${title}`;
            const data = await fetchBooks(query);

            if (!data || !data.items) {
                return res.status(404).json({ message: `No books found with the title "${title}"` });
            }

            const bookData = data.items[0].volumeInfo;
            const bookDetails = {
                title: bookData.title,
                author: bookData.authors ? bookData.authors.join(', ') : 'Unknown',
                genre: genre || 'Unknown',
                publishedDate: bookData.publishedDate || 'Unknown',
                coverImage: bookData.imageLinks?.thumbnail || 'No image available',
            };

            const existingBook = await Book.findOne({ title: bookDetails.title, author: bookDetails.author });
            if (existingBook) {
                return res.status(409).json({ message: "This book already exists in your collection" });
            }

            const newBook = new Book(bookDetails);
            await newBook.save();

            await User.findByIdAndUpdate(userId, { $push: { books: newBook._id } });

            return res.status(201).json({ message: "Book added successfully!", book: newBook });
        }

        const newBook = new Book({ title, author, genre, publishedDate });
        await newBook.save();

        await User.findByIdAndUpdate(userId, { $push: { books: newBook._id } });

        return res.status(201).json({ message: "Book added successfully!", book: newBook });
    } catch (error) {
        return res.status(500).json({ message: "An unknown error occurred!" });
    }
};

export const getUserBooks = async (req, res) => {
    try {
        const userId = req.user._id;
        const foundUser = await User.findById(userId).populate({
            path: 'books',
            options: {
                sort: sort || { title: 1 },
            }
        });

        if (!foundUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const books = foundUser.books;
        const totalBooks = books.length;

        return res.status(200).json({
            totalBooks,
            books,
        });
    } catch (error) {
        return res.status(500).json({ message: "An error occurred while retrieving the books" });
    }
};

export const updateBookStatus = async (req, res) => {
    try {
        const userId = req.user._id;
        const { title, readStatus } = req.body;

        if (!title || !readStatus) {
            return res.status(400).json({ message: "Book title and ReadStatus are required!" });
        }

        if (!['Not Started', 'In Progress', 'Completed'].includes(readStatus)) {
            return res.status(400).json({ message: "Invalid Read Status!" });
        }

        const foundUser = await User.findById(userId).populate('books');
        const book = foundUser.books.find(b => b.title === title);

        if (!book) {
            return res.status(404).json({ message: "Book not found in your collection" });
        }

        book.status = readStatus;
        await book.save();

        return res.status(200).json({ message: "Read status updated successfully!" });
    } catch (error) {
        return res.status(500).json({ message: "An error occurred while updating the read status" });
    }
};

export const deleteBooks = async (req, res) => {
    try {
        const userId = req.user._id;
        const { title, author } = req.body;

        if (!title) {
            return res.status(404).json({ message: `There is no book with the title "${title}" in your collection` });
        }

        const userD = await User.findById(userId).populate('books');

        if (!userD) {
            return res.status(404).json({ message: "User not found" });
        }

        const bookD = userD.books.find(b => b.title === title && (!author || b.author === author));

        if (!bookD) {
            return res.status(404).json({ message: `No book found with title "${title}" in your collection` });
        }

        userD.books = userD.books.filter(b => b._id.toString() !== bookD._id.toString());
        await userD.save();
        await Book.findByIdAndDelete(bookD._id);

        return res.status(200).json({ message: `Book "${title}" by ${author || 'unknown author'} has been successfully deleted from your collection` });
    } catch (error) {
        return res.status(500).json({ message: "An unknown error has occurred" });
    }
};
