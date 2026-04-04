import {ChatSvg} from "@/assets/ChatSvg.tsx";
import {ZipFileSvg} from "@assets/ZipFileSvg.tsx";

export const SvgProcessor = ({id}: {id: string}) => {
    const filteredSvg = (name: string) => {
        return name == "Chat" ? <ChatSvg id={id} /> : <ZipFileSvg id={id} />;
    }
    return (
        <>
            {filteredSvg}
        </>
    )
}