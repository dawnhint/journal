export function HelpDoc() {
  return (
    <div className="px-2 py-2 text-[13px] leading-relaxed text-[#636363]">
      <p className="text-[#111]">这是什么</p>
      <ul className="mt-1 list-disc list-outside pl-4">
        <li>
          这是一本电子手帐，特点是周视图的记录方法。就像现实中的手账本一样，你能够在一页里概览每一周发生的主要事件。
        </li>
      </ul>
      <p className="mt-3 text-[#111]">Tips</p>
      <ul className="mt-1 list-disc list-outside pl-4">
        <li>数据只保存在本地浏览器里。</li>
        <li>
          切换的用户可以是不同的身份，也可以是不同的主题，比如“生活”、“学习”等。
        </li>
      </ul>
      <p className="mt-3 text-[#111]">关于作者</p>
      <ul className="mt-1 list-disc list-outside pl-4 [&_a:hover]:text-[#1966a7]">
        <li>
          <a href="https://akarii.art" target="_blank">
            Akari↗
          </a>
          <span className="mx-1"> </span>
          <a href="https://github.com/dawnhint/journal" target="_blank">
            Github↗
          </a>
        </li>
      </ul>
    </div>
  );
}
