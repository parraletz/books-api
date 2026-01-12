import { Hono } from "hono"
import { prettyJSON } from "hono/pretty-json"

const app = new Hono()
app.use(prettyJSON())

const books: Array<{
  title: string
  author: string
  isbn: string
}> = [
  {
    title: "Dune",
    author: "Frank Herbert",
    isbn: "9780441013593",
  },
  {
    title: "Neuromancer",
    author: "William Gibson",
    isbn: "9780441569595",
  },
  {
    title: "Foundation",
    author: "Isaac Asimov",
    isbn: "9780553293357",
  },
  {
    title: "Snow Crash",
    author: "Neal Stephenson",
    isbn: "9780553380958",
  },
  {
    title: "The Left Hand of Darkness",
    author: "Ursula K. Le Guin",
    isbn: "9780441478125",
  },
  {
    title: "Hyperion",
    author: "Dan Simmons",
    isbn: "9780553283686",
  },
  {
    title: "Ender's Game",
    author: "Orson Scott Card",
    isbn: "9780812550702",
  },
  {
    title: "The Martian",
    author: "Andy Weir",
    isbn: "9780553418026",
  },
  {
    title: "Do Androids Dream of Electric Sheep?",
    author: "Philip K. Dick",
    isbn: "9780345404473",
  },
  {
    title: "The Three-Body Problem",
    author: "Liu Cixin",
    isbn: "9780765382030",
  },
]

app.get("/", (c) => {
  return c.text("Hello Hono!")
})

app.get("/books", (c) => {
  return c.json(books)
})

export default app
