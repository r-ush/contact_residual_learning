"""Local-only static preview with byte ranges for reliable video seeking."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

class PreviewServer(ThreadingHTTPServer):
    # Browsers request posters, styles and multiple video ranges concurrently.
    # The default queue of five can refuse local connections on a cold load.
    request_queue_size = 128

class Handler(SimpleHTTPRequestHandler):
    def send_head(self):
        self.remaining = None
        path = Path(self.translate_path(self.path)).resolve()
        if not path.is_relative_to(ROOT) or any(part in {'.git', 'build', '__pycache__'} for part in path.relative_to(ROOT).parts) or path.name.endswith('.local.json'):
            self.send_error(404)
            return None
        value = self.headers.get('Range')
        if not value or not path.is_file():
            return super().send_head()
        match = re.fullmatch(r'bytes=(\d*)-(\d*)', value)
        size = path.stat().st_size
        if not match or not any(match.groups()):
            self.send_error(416)
            return None
        first, last = match.groups()
        start = int(first) if first else max(0, size-int(last))
        end = min(int(last), size-1) if first and last else size-1
        if start > end or start >= size:
            self.send_response(416)
            self.send_header('Content-Range', f'bytes */{size}')
            self.end_headers()
            return None
        stream = path.open('rb')
        stream.seek(start)
        self.remaining = end-start+1
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(str(path)))
        self.send_header('Content-Length', str(self.remaining))
        self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.send_header('Last-Modified', self.date_time_string(path.stat().st_mtime))
        self.end_headers()
        return stream

    def end_headers(self):
        self.send_header('Accept-Ranges', 'bytes')
        super().end_headers()

    def copyfile(self, source, outputfile):
        if self.remaining is None:
            try:
                return super().copyfile(source, outputfile)
            except (ConnectionResetError, BrokenPipeError):
                return
        left = self.remaining
        try:
            while left:
                data = source.read(min(left, 64*1024))
                if not data:
                    break
                outputfile.write(data)
                left -= len(data)
        except (ConnectionResetError, BrokenPipeError):
            pass

if __name__ == '__main__':
    print('Local preview: http://127.0.0.1:8765  (Ctrl+C to stop)', flush=True)
    with PreviewServer(('127.0.0.1', 8765), partial(Handler, directory=str(ROOT))) as server:
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
