from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import KeepInFrame, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "farpostscot-app-summary.pdf"


def p(text, style, **kwargs):
    return Paragraph(text, style, **kwargs)


def build_pdf():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    page_w, page_h = A4
    margin = 12 * mm
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        leftMargin=margin,
        rightMargin=margin,
        topMargin=margin,
        bottomMargin=margin,
    )

    styles = getSampleStyleSheet()
    title = ParagraphStyle(
        "Title",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=22,
        leading=24,
        textColor=colors.HexColor("#111213"),
        spaceAfter=3,
    )
    subtitle = ParagraphStyle(
        "Subtitle",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9,
        leading=11,
        textColor=colors.HexColor("#666666"),
        spaceAfter=7,
    )
    h = ParagraphStyle(
        "Section",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=12,
        textColor=colors.HexColor("#C43838"),
        spaceAfter=3,
    )
    body = ParagraphStyle(
        "Body",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=8.6,
        leading=10.2,
        textColor=colors.HexColor("#1F1F1F"),
        spaceAfter=2,
    )
    bullet = ParagraphStyle(
        "Bullet",
        parent=body,
        leftIndent=8,
        firstLineIndent=-5,
        bulletIndent=0,
        bulletFontName="Helvetica-Bold",
        bulletFontSize=8.6,
        bulletColor=colors.HexColor("#C43838"),
        spaceAfter=1.2,
    )
    small = ParagraphStyle(
        "Small",
        parent=body,
        fontSize=7.7,
        leading=9.2,
        textColor=colors.HexColor("#3B3B3B"),
        spaceAfter=1.5,
    )

    left_width = 87 * mm
    right_width = page_w - doc.leftMargin - doc.rightMargin - left_width - 6 * mm

    left_story = [
        p("What It Is", h),
        p(
            "Far Post is a static, multi-page Scottish football site that combines editorial content with live-ish competition data. "
            "The repo shows news, opinions, podcasts, results, fixtures, match pages, and club pages powered by browser-side fetches plus Netlify Functions.",
            body,
        ),
        Spacer(1, 3),
        p("Who It's For", h),
        p(
            "Primary persona: Scottish football fans who want one destination for articles, podcast episodes, scores, fixtures, and team-specific match context.",
            body,
        ),
        Spacer(1, 3),
        p("What It Does", h),
        p("Homepage surfaces latest articles in a hero carousel plus recent results and podcasts.", bullet, bulletText="-"),
        p("News and opinion pages query Sanity posts and render article cards.", bullet, bulletText="-"),
        p("Article pages load individual posts and related stories from Sanity.", bullet, bulletText="-"),
        p("Results and fixtures pages fetch Scottish competition data from Sportmonks.", bullet, bulletText="-"),
        p("Club pages show recent form, latest results, upcoming fixtures, standings, and top scorers.", bullet, bulletText="-"),
        p("Match pages request a single fixture with events, lineups, participants, scores, and state.", bullet, bulletText="-"),
        p("Podcasts page pulls the 'Across the Tiers' RSS feed through a Netlify proxy.", bullet, bulletText="-"),
    ]

    right_story = [
        p("How It Works", h),
        p(
            "<b>Frontend:</b> Root-level static HTML pages such as index.html, news.html, results.html, fixtures.html, match.html, and club.html contain inline CSS and JavaScript.",
            body,
        ),
        p(
            "<b>Content service:</b> netlify/functions/sanity-fetch.js proxies GROQ queries to Sanity "
            "(project <font name='Courier'>t11tx9if</font>, dataset <font name='Courier'>production</font>) using <font name='Courier'>SANITY_TOKEN</font>.",
            body,
        ),
        p(
            "<b>Football data services:</b> Netlify Functions call Sportmonks V3 using <font name='Courier'>SPORTMONKS_TOKEN</font> for "
            "results, fixtures, standings, top scorers, match detail, team form, and club summary.",
            body,
        ),
        p(
            "<b>Podcast service:</b> netlify/functions/podcast.js proxies the Acast RSS feed server-side to avoid CORS issues.",
            body,
        ),
        p(
            "<b>Data flow:</b> Browser page -> <font name='Courier'>/.netlify/functions/*</font> -> Sanity / Sportmonks / Acast -> normalized response -> DOM render.",
            body,
        ),
        Spacer(1, 3),
        p("How To Run", h),
        p("1. Open the repo root; site pages are served from <font name='Courier'>.</font> and functions from <font name='Courier'>netlify/functions</font> per <font name='Courier'>netlify.toml</font>.", body),
        p("2. Set required environment variables: <font name='Courier'>SANITY_TOKEN</font> and <font name='Courier'>SPORTMONKS_TOKEN</font>.", body),
        p("3. Run the site with a local Netlify-compatible dev server so <font name='Courier'>/.netlify/functions/*</font> routes work. Exact command: <b>Not found in repo.</b>", body),
        p("4. Open the local site entry page, likely <font name='Courier'>index.html</font>. Port / dev URL: <b>Not found in repo.</b>", body),
        Spacer(1, 3),
        p("Notes", h),
        p("Package manifest, install script, and formal README/getting-started docs: <b>Not found in repo.</b>", small),
        p("Summary is based only on files and code present in this repository.", small),
    ]

    left_box = KeepInFrame(left_width, page_h - 2 * margin - 24, left_story, mode="shrink")
    right_box = KeepInFrame(right_width, page_h - 2 * margin - 24, right_story, mode="shrink")

    content = Table(
        [[left_box, right_box]],
        colWidths=[left_width, right_width],
        hAlign="LEFT",
    )
    content.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )

    story = [
        p("Far Post App Summary", title),
        p("One-page repo-based overview", subtitle),
        content,
    ]

    doc.build(story)
    print(OUTPUT)


if __name__ == "__main__":
    build_pdf()
