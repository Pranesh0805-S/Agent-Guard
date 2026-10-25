import asyncio, pathlib, subprocess, shutil
from playwright.async_api import async_playwright

HERE = pathlib.Path(__file__).resolve().parent
HTML = HERE / "render.html"
FRAMES = HERE / "frames"
DUR = [6, 7, 7, 9, 7, 9, 8, 7]  # sums to 60s
FPS = 30
FFMPEG = r"C:\Users\prane\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe"

SCENES = """
<div class="scene" id="s1"><div class="title">An AI agent reads an email.<br>The email is the attacker.</div></div>
<div class="scene" id="s2"><div class="title" style="font-size:60px">Prompt injection hides instructions in content the agent reads.</div>
  <div class="flow"><div class="node">Inbox</div><div class="arrow">→</div><div class="node">Agent</div><div class="arrow">→</div><div class="node no">send_email to<br>vendor-payments.example</div></div></div>
<div class="scene" id="s3"><div class="title" style="font-size:58px">Agent Guard sits between the agent and its tools.</div>
  <div class="flow"><div class="node">Agent</div><div class="arrow">→</div><div class="node" style="border-color:#f5a524">Guard</div><div class="arrow">→</div><div class="node">Tool</div></div>
  <div class="sub">Every risky action passes through the guard first.</div></div>
<div class="scene" id="s4"><div class="title" style="font-size:58px">Three layers. Each one catches what the last one missed.</div>
  <div class="layers">
    <div class="layer"><b>1 · Allowlist</b>Deterministic. Sends outside the company domain are stopped. No model call.</div>
    <div class="layer"><b>2 · Blind reviewer</b>A second model call sees only your goal and the action, never the email body.</div>
    <div class="layer"><b>3 · Approval queue</b>Anything blocked waits for a human to approve or deny.</div></div></div>
<div class="scene" id="s5"><div class="title" style="font-size:56px">Why a blind reviewer?</div>
  <div class="sub" style="font-size:38px;max-width:1500px">The attacker's text can't argue with a reviewer that never reads it.</div></div>
<div class="scene" id="s6"><div class="title" style="font-size:56px">Measured on Claude Haiku 4.5 · 20 runs each</div>
  <div class="pair"><div><div class="num no">6/20</div><div class="lab">attacks got through · guard off</div></div>
  <div><div class="num ok">0/20</div><div class="lab">attacks got through · guard on</div></div></div></div>
<div class="scene" id="s7"><div class="title" style="font-size:58px">Harmless tasks completed</div>
  <div class="pair"><div><div class="num">15/15</div><div class="lab">guard off</div></div><div><div class="num">15/15</div><div class="lab">guard on</div></div></div>
  <div class="sub" style="font-size:30px">The guard didn't block the work it should allow.</div></div>
<div class="scene" id="s8"><div class="title">Agent Guard</div>
  <div class="sub">Prompt-injection defense for tool-using agents.<br>Limits are documented in the README.</div>
  <div class="sub" style="font-size:28px;color:#5d6e82">github.com/Pranesh0805-S/Agent-Guard</div></div>
"""

CSS = """
html,body{margin:0;background:#0b0f14;color:#e8eef5;font-family:"Segoe UI",Arial,sans-serif;width:1920px;height:1080px;overflow:hidden}
.scene{position:absolute;inset:0;opacity:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:90px;box-sizing:border-box;text-align:center}
.title{font-size:72px;font-weight:600;letter-spacing:-1px;line-height:1.18;max-width:1600px}
.sub{font-size:34px;color:#9fb3c8;margin-top:30px;line-height:1.4;max-width:1400px}
.flow{display:flex;align-items:center;gap:28px;margin-top:60px;font-size:34px}
.node{padding:26px 34px;border-radius:14px;background:#141b24;border:1px solid #2a3847}
.arrow{color:#5d6e82;font-size:44px}
.ok{color:#3ecf8e}.no{color:#e5484d}
.layers{display:flex;gap:40px;margin-top:60px}
.layer{width:460px;padding:40px 36px;border-radius:16px;background:#141b24;border:1px solid #2a3847;font-size:30px;line-height:1.45}
.layer b{display:block;font-size:40px;margin-bottom:14px}
.num{font-size:150px;font-weight:700;letter-spacing:-4px;line-height:1}
.pair{display:flex;gap:120px;margin-top:50px}
.lab{font-size:30px;color:#9fb3c8;margin-top:18px}
"""

def write_html():
    HTML.write_text(f"<!doctype html><html><head><meta charset='utf-8'><style>{CSS}</style></head><body>{SCENES}</body></html>", encoding="utf-8")

async def render_frames():
    FRAMES.mkdir(exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={"width": 1920, "height": 1080})
        await pg.goto(HTML.as_uri())
        n = 0
        for i, d in enumerate(DUR, start=1):
            frames = d * FPS
            for f in range(frames):
                fi = min(1.0, (f / FPS) / 0.5)
                fo = min(1.0, ((frames - f) / FPS) / 0.5)
                op = min(fi, fo)
                await pg.evaluate(f"() => {{ document.querySelectorAll('.scene').forEach(s => s.style.opacity = 0); document.getElementById('s{i}').style.opacity = {op:.3f}; }}")
                await pg.screenshot(path=str(FRAMES / f"f{n:05d}.png"))
                n += 1
        await b.close()

def encode():
    subprocess.run([FFMPEG, "-y", "-framerate", str(FPS), "-i", str(FRAMES / "f%05d.png"),
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", str(HERE / "brag.mp4")], check=True)
    subprocess.run([FFMPEG, "-y", "-ss", "2", "-i", str(HERE / "brag.mp4"), "-frames:v", "1", "-q:v", "2", str(HERE / "brag.jpg")], check=True)
    shutil.rmtree(FRAMES, ignore_errors=True)

if __name__ == "__main__":
    write_html()
    asyncio.run(render_frames())
    encode()
    print("Done:", HERE / "brag.mp4")