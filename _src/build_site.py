# -*- coding: utf-8 -*-
"""从 数据/tools.json 生成静态站点：首页、每个工具一页、sitemap。"""

from __future__ import annotations

import html
import json
import os
import shutil
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data", "tools.json")
SITE = ROOT
TOOLS_DIR = os.path.join(SITE, "tools")
DOMAIN = "https://getpingti.com"

e = html.escape


def n(value: int) -> str:
    return f"{value:,}"


def badge(tool: dict) -> str:
    growth = ""
    if tool["trend"] == "up" and tool["growth"]:
        growth = f'<span class="badge up">↑ {n(tool["growth"])} / 天</span>'
    elif tool["trend"] == "evergreen":
        growth = '<span class="badge ever">长青工具</span>'
    if tool.get("added") == date.today().isoformat():
        growth += '<span class="badge new">今日新增</span>'
    return growth


def card(tool: dict, rank: int) -> str:
    replaces = "".join(
        f'<span class="badge replace">替代 {e(r)}</span>' for r in tool["replaces"][:2]
    )
    stars = f'<span class="stars">{n(tool["stars"])}</span>' if tool["stars"] else ""
    text = " ".join(
        [tool["name"], tool["repo"], tool["category"], tool["summary"], tool["verdict"]]
        + tool["replaces"]
    )
    return f"""      <article class="card" data-slug="{e(tool['slug'])}" data-cat="{e(tool['category'])}" data-text="{e(text)}">
        <div class="card-top">
          <span class="rank">{rank:02d}</span>
          <h2><a href="/tools/{e(tool['slug'])}">{e(tool['name'])}</a></h2>
        </div>
        <div class="badges">{badge(tool)}{replaces}</div>
        <p>{e(tool['summary'])}</p>
        <div class="verdict">{e(tool['verdict'])}</div>
        <div class="card-foot">
          {stars}
          <span>{e(tool['license'])}</span>
          <a class="go" href="/tools/{e(tool['slug'])}">看评测 →</a>
        </div>
      </article>"""


def page(title: str, desc: str, body: str, canonical: str, extra_js: str = "") -> str:
    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{DOMAIN}{canonical}">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/style.css">
</head>
<body>
<header class="topbar">
  <div class="wrap">
    <a class="logo" href="/">开源平替</a>
    <nav class="nav">
      <a href="/#list" aria-current="page">今日更新</a>
      <a href="/about">关于</a>
    </nav>
    <div class="search">
      <input id="q" type="search" placeholder="搜软件，或你想替掉的付费软件" autocomplete="off">
      <kbd>/</kbd>
    </div>
  </div>
</header>
{body}
<footer>
  <div class="wrap">
    <span>© {date.today().year} 开源平替</span>
    <a href="/about">关于</a>
    <a href="https://github.com/getpingti/pingti-templates" rel="noopener">模板仓库</a>
    <span>只收录能真正替代付费软件的开源项目；链接指向官方仓库，不接软文。</span>
  </div>
</footer>
<script src="/assets/app.js"></script>
{extra_js}
</body>
</html>
"""


def build_index(tools: list[dict]) -> str:
    cats = ["全部"] + sorted({t["category"] for t in tools})
    chips = "".join(
        f'<button class="chip" data-cat="{e(c)}" aria-pressed="{"true" if c == "全部" else "false"}">{e(c)}</button>'
        for c in cats
    )
    cards = "\n".join(card(t, i + 1) for i, t in enumerate(tools))
    total_stars = sum(t["stars"] for t in tools)
    body = f"""<main>
  <section class="hero">
    <div class="wrap">
      <h1>每天 1–2 个突然走红的开源软件，<br>替掉你正在付费的那个</h1>
      <p>每天从 GitHub 新冒头的项目里挑 1–2 个，只收能对应到具体收费软件的小工具。每个都写清楚：<strong>能替多少、哪里不行、去哪里下</strong>。</p>
      <div class="stats">
        <div class="stat"><b>1–2</b><span>每天更新</span></div>
        <div class="stat"><b>{len(tools)}</b><span>累计收录</span></div>
        <div class="stat"><b>{n(total_stars)}</b><span>项目总星标</span></div>
        <div class="stat"><b>0</b><span>广告 / 软文</span></div>
      </div>
    </div>
  </section>

  <section class="wrap" id="list">
    <div class="list-head">
      <h2>最新收录</h2>
      <span>每天新增 1–2 个 · 更新于 {date.today().isoformat()}</span>
    </div>
    <div class="toolbar">
      <div class="chips">{chips}</div>
      <span class="count" id="count">共 {len(tools)} 个</span>
    </div>
    <div class="grid" id="grid">
{cards}
      <div class="empty" id="empty" hidden>没有匹配的工具。换个关键词，或清空筛选。</div>
    </div>
  </section>
</main>"""
    return page(
        "开源平替 · 每天 1–2 个走红的开源软件",
        "每天收录 1–2 个 GitHub 上星标快速上涨的开源软件，分析它们能替代哪些付费软件，附项目地址与下载链接。",
        body,
        "/",
    )


def build_tool(tool: dict, tools: list[dict]) -> str:
    meta = [f'<span>{e(tool["category"])}</span>']
    if tool["stars"]:
        meta.append(f'<span>★ {n(tool["stars"])}</span>')
    if tool["trend"] == "up" and tool["growth"]:
        meta.append(f'<span>本周 ↑ {n(tool["growth"])}</span>')
    else:
        meta.append("<span>长青工具</span>")
    meta.append(f'<span>{e(tool["license"])}</span>')
    meta.extend(f"<span>{e(p)}</span>" for p in tool["platforms"])

    replaces = "".join(
        f'<li>{e(r)}</li>' for r in tool["replaces"]
    )
    pros = "".join(f"<li>{e(x)}</li>" for x in tool["pros"])
    cons = "".join(f"<li>{e(x)}</li>" for x in tool["cons"])

    others = [t for t in tools if t["slug"] != tool["slug"]][:3]
    more = "".join(
        f'<a href="/tools/{e(t["slug"])}">{e(t["name"])}<span>{e(t["replaces"][0])}</span></a>'
        for t in others
    )

    body = f"""<main class="article">
  <div class="crumb"><a href="/">开源平替</a> / {e(tool['category'])} / {e(tool['name'])}</div>
  <h1>{e(tool['name'])}</h1>
  <p class="lead">{e(tool['summary'])}</p>
  <div class="meta">{''.join(meta)}</div>

  <div class="verdict-box">{e(tool['verdict'])}</div>

  <h2>它能替代什么</h2>
  <ul>{replaces}</ul>

  <h2>实测</h2>
  {''.join(f'<p>{e(p)}</p>' for p in tool['review'].split('\n\n') if p.strip())}

  <div class="cols">
    <div class="col good"><h3>值得装的地方</h3><ul>{pros}</ul></div>
    <div class="col bad"><h3>它做不到的</h3><ul>{cons}</ul></div>
  </div>

  <h2>项目与下载</h2>
  <div class="links">
    <a href="https://github.com/{e(tool['repo'])}" rel="noopener">GitHub 仓库<span>{e(tool['repo'])}</span></a>
    <a href="{e(tool['homepage'])}" rel="noopener">官方网站<span>{e(tool['homepage'].replace('https://', ''))}</span></a>
    <a href="{e(tool['download'])}" rel="noopener">下载 / 安装包<span>官方发布页</span></a>
  </div>

  <h2>接着看</h2>
  <div class="links">{more}</div>
</main>"""
    return page(
        f"{tool['name']} 评测 · 替代 {tool['replaces'][0]} · 开源平替",
        f"{tool['summary']} {tool['verdict']}",
        body,
        f"/tools/{tool['slug']}",
    )


def build_about() -> str:
    body = """<main class="article">
  <div class="crumb"><a href="/">开源平替</a> / 关于</div>
  <h1>关于这个站</h1>
  <p class="lead">每天 1–2 个突然走红的开源软件，只回答一个问题：它能不能替掉你正在付费的那个。</p>

  <h2>怎么选的</h2>
  <p>看三个信号：GitHub 星标最近一周的增速、是不是能对应到一款具体的收费软件、有没有可用的安装包。三者缺一个就不收。</p>

  <h2>怎么评的</h2>
  <p>每期都自己装一遍，用真实文件跑一遍，再写三件事：能替多少、哪里不行、装完要注意什么。只写优点、不提缺点的评测，没有价值。</p>

  <h2>链接说明</h2>
  <p>项目地址和下载链接都指向官方 GitHub 仓库或官网，不经过跳转、不带返利。收录不收钱，也不接“只许说好话”的合作。</p>

  <h2>免责声明</h2>
  <p>开源软件的使用条款以项目仓库为准；下载前请确认许可证和平台。本站只做信息整理与实测记录，不对项目本身的安全性和后续维护负责。</p>
</main>"""
    return page("关于 · 开源平替", "开源平替站的选品与评测方法。", body, "/about")


def main():
    with open(DATA, encoding="utf-8") as fh:
        tools = json.load(fh)
    order = {"up": 0, "evergreen": 1}
    today = date.today().isoformat()
    tools.sort(key=lambda t: (t.get("added") != today, order.get(t["trend"], 2), -t["growth"], -t["stars"], t["name"]))

    os.makedirs(TOOLS_DIR, exist_ok=True)
    for name in os.listdir(TOOLS_DIR):
        if name.endswith(".html"):
            os.remove(os.path.join(TOOLS_DIR, name))

    with open(os.path.join(SITE, "index.html"), "w", encoding="utf-8") as fh:
        fh.write(build_index(tools))
    for tool in tools:
        with open(os.path.join(TOOLS_DIR, f"{tool['slug']}.html"), "w", encoding="utf-8") as fh:
            fh.write(build_tool(tool, tools))
    with open(os.path.join(SITE, "about.html"), "w", encoding="utf-8") as fh:
        fh.write(build_about())

    urls = ["/", "/about"] + [f"/tools/{t['slug']}" for t in tools]
    sitemap = ['<?xml version="1.0" encoding="UTF-8"?>',
               '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        sitemap.append(f"  <url><loc>{DOMAIN}{u}</loc></url>")
    sitemap.append("</urlset>")
    with open(os.path.join(SITE, "sitemap.xml"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(sitemap))

    print(f"built {len(tools)} tools, {len(urls)} urls")


if __name__ == "__main__":
    main()
