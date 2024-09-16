import { SlashCommandBuilder } from "discord.js";
import sharp from "sharp";
import path from "node:path";
import { readFileSync } from "node:fs";

export default {
  data: new SlashCommandBuilder()
    .setName("speechbubble")
    .setDescription("Adds a speech bubble to an image.")
    .addAttachmentOption((option) =>
      option
        .setName("file")
        .setDescription("Upload an image.")
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName("flip")
        .setDescription("Flip the speech bubble horizontally.")
        .setRequired(false)
    ),
  async execute(interaction) {
    const file = interaction.options.getAttachment("file");
    const flip = interaction.options.getBoolean("flip") || false;

    if (!file || !file.contentType?.startsWith("image/")) {
      await interaction.reply({
        content: "Please upload a valid image.",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    try {
      const imageResponse = await fetch(file.url);
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

      const speechBubblePath = path.join(
        import.meta.dirname,
        "../assets/speechbubble.png"
      );
      const speechBubbleBuffer = readFileSync(speechBubblePath);

      const baseImage = sharp(imageBuffer);
      const metadata = await baseImage.metadata();

      if (!metadata.width || !metadata.height) {
        throw new Error("Invalid image dimensions.");
      }

      const targetHeight = Math.floor(metadata.height * 0.2);

      const speechBubble = sharp(speechBubbleBuffer)
        .resize({ width: metadata.width })
        .toBuffer();

      const speechBubbleMetadata = await sharp(await speechBubble).metadata();

      let finalSpeechBubble;
      if (
        speechBubbleMetadata.height &&
        speechBubbleMetadata.height > targetHeight
      ) {
        finalSpeechBubble = sharp(await speechBubble).resize({
          width: metadata.width,
          height: targetHeight,
          fit: sharp.fit.fill,
        });
      } else {
        finalSpeechBubble = sharp(await speechBubble);
      }

      if (flip) {
        finalSpeechBubble.flop();
      }

      const combinedImageBuffer = await baseImage
        .composite([
          {
            input: await finalSpeechBubble.toBuffer(),
            top: 0,
            left: 0,
          },
        ])
        .png()
        .toBuffer();

      await interaction.followUp({
        files: [{ attachment: combinedImageBuffer, name: "speechbubble.png" }],
      });
    } catch (error) {
      console.error("Error processing image:", error);
      await interaction.followUp({
        content: "There was an error processing the image.",
      });
    }
  },
};
