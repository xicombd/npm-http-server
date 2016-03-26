import fs from 'fs'
import path from 'path'
import mime from 'mime'
import byteSize from 'byte-size'
import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'

const DOCTYPE = '<!DOCTYPE html>'

const DirectoryListing = (props) => {
  const { entries } = props

  const rows = entries.map(({ file, stats }, index) => {
    const isDir = stats.isDirectory()
    const href = file + (isDir ? '/' : '')

    return (
      <tr key={file} className={index % 2 ? 'odd' : 'even'}>
        <td><a title={file} href={href}>{file}</a></td>
        <td>{new Date(stats.mtime).toISOString()}</td>
        <td>{byteSize(stats.size)}</td>
        <td>{isDir ? '-' : mime.lookup(file)}</td>
      </tr>
    )
  })

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Last Modified</th>
          <th>Size</th>
          <th>Type</th>
        </tr>
      </thead>
      <tbody>
        {rows}
      </tbody>
    </table>
  )
}

const getStats = (file) =>
  new Promise((resolve, reject) => {
    fs.stat(file, (error, stats) => {
      if (error) {
        reject(error)
      } else {
        resolve(stats)
      }
    })
  })

const getEntries = (dir) =>
  new Promise((resolve, reject) => {
    fs.readdir(dir, (error, files) => {
      if (error) {
        reject(error)
      } else {
        resolve(
          Promise.all(
            files.map(file => getStats(path.join(dir, file)))
          ).then(
            statsArray => statsArray.map(
              (stats, index) => ({ file: files[index], stats })
            )
          )
        )
      }
    })
  })

const generateIndexPage = (baseDir, dir, entries) => {
  const dirname = dir.replace(baseDir, '')

  return DOCTYPE + renderToStaticMarkup(
    <html>
      <head>
        <title>Index of {dirname}</title>
        <style>{`
          body {
            font: 14px Monaco, monospace;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          tr.even {
            background-color: #eee;
          }
          th {
            text-align: left;
          }
          th, td {
            padding: 0.1em 0.25em;
          }
        `}</style>
      </head>
      <body>
        <h1>Index of {dirname}</h1>
        <hr/>
        <DirectoryListing entries={entries}/>
      </body>
    </html>
  )
}

export const generateDirectoryIndexHTML = (baseDir, dir, callback) =>
  getEntries(path.join(baseDir, dir))
    .then(entries => generateIndexPage(baseDir, dir, entries))
    .then(html => callback(null, html), callback)
