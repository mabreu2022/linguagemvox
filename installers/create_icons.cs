using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Text;
using System.IO;

namespace VoxIconBuilder
{
    class Program
    {
        static void Main(string[] args)
        {
            string baseDir = @"d:\Projetos AntiGravity\linguagem\installers\assets";
            Directory.CreateDirectory(baseDir);

            // 1. Ícone da Linguagem Vox
            CreateIcon(
                Path.Combine(baseDir, "vox_lang.ico"),
                "VOX",
                Color.FromArgb(20, 24, 40),
                Color.FromArgb(124, 111, 247),
                Color.FromArgb(255, 202, 40),
                "⚡"
            );

            // 2. Ícone do Vox Studio RAD
            CreateIcon(
                Path.Combine(baseDir, "vox_studio.ico"),
                "RAD",
                Color.FromArgb(15, 23, 42),
                Color.FromArgb(0, 152, 255),
                Color.FromArgb(56, 189, 248),
                "💠"
            );

            Console.WriteLine("Ícones gerados com sucesso!");
        }

        static void CreateIcon(string outputPath, string title, Color bg1, Color bg2, Color fgColor, string symbol)
        {
            int size = 128;
            using (Bitmap bmp = new Bitmap(size, size))
            using (Graphics g = Graphics.FromImage(bmp))
            {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                g.TextRenderingHint = TextRenderingHint.AntiAliasGridFit;
                g.InterpolationMode = InterpolationMode.HighQualityBicubic;

                // Fundo com cantos arredondados
                Rectangle rect = new Rectangle(4, 4, size - 8, size - 8);
                using (LinearGradientBrush brush = new LinearGradientBrush(rect, bg1, bg2, LinearGradientMode.ForwardDiagonal))
                using (GraphicsPath path = GetRoundedRect(rect, 28))
                {
                    g.FillPath(brush, path);

                    using (Pen pen = new Pen(Color.FromArgb(120, 255, 255, 255), 2.5f))
                    {
                        g.DrawPath(pen, path);
                    }
                }

                // Símbolo Central
                using (Font symFont = new Font("Segoe UI Emoji", 44, FontStyle.Bold))
                using (Brush symBrush = new SolidBrush(fgColor))
                using (StringFormat sf = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center })
                {
                    g.DrawString(symbol, symFont, symBrush, new RectangleF(0, 14, size, 65), sf);
                }

                // Texto Inferior
                using (Font txtFont = new Font("Segoe UI", 16, FontStyle.Bold))
                using (Brush txtBrush = new SolidBrush(Color.White))
                using (StringFormat sf = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center })
                {
                    g.DrawString(title, txtFont, txtBrush, new RectangleF(0, 84, size, 32), sf);
                }

                // Salvar como .ico
                IntPtr hIcon = bmp.GetHicon();
                using (Icon icon = Icon.FromHandle(hIcon))
                using (FileStream fs = new FileStream(outputPath, FileMode.Create))
                {
                    icon.Save(fs);
                }
            }
        }

        static GraphicsPath GetRoundedRect(Rectangle bounds, int radius)
        {
            int diameter = radius * 2;
            GraphicsPath path = new GraphicsPath();
            path.AddArc(bounds.X, bounds.Y, diameter, diameter, 180, 90);
            path.AddArc(bounds.Right - diameter, bounds.Y, diameter, diameter, 270, 90);
            path.AddArc(bounds.Right - diameter, bounds.Bottom - diameter, diameter, diameter, 0, 90);
            path.AddArc(bounds.X, bounds.Bottom - diameter, diameter, diameter, 90, 90);
            path.CloseFigure();
            return path;
        }
    }
}
